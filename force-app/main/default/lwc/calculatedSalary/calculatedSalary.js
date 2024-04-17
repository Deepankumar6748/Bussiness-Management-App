import { LightningElement ,api,track, wire} from 'lwc';
import getCalculateWages from '@salesforce/apex/getrecords.getCalculateWages';
import { createRecord , getFieldValue, getRecord, updateRecord} from 'lightning/uiRecordApi';
import  EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import  EXTRA_AMOUNT_ID from '@salesforce/schema/Account.ExtraAmtWageId__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class CalculatedSalary extends LightningElement {
    @track CalculateWagesRecords;
    @api recordId;
    @api TotalBalanceWage;
    @track isdisablePayWage;
    @track ExtraAmtWage;
    @track ExtraAmtWageId;
    @wire(getCalculateWages,{recordId : "$recordId"})
    CalculateWagesRec({error, data}) {
        if (data) {
            // TODO: Error handling
            let records = JSON.parse(JSON.stringify(data));
            this.CalculateWagesRecords = records;
            console.log("GetCalculateWagesRec Success");
        } else if (error) {
            // TODO: Data 
            console.error("getCalculateWages error",error);
            this.ErrorToastmsg(error);
        }
    }
    @wire(getRecord, { recordId: "$recordId", fields: [EXTRA_AMOUNT,EXTRA_AMOUNT_ID] })      
    wiredData({ error, data }) {
        if (data) {
            this.ExtraAmtWage = data.fields['ExtraAmtWage__c'].value;
            this.ExtraAmtWageId = data.fields['ExtraAmtWageId__c'].value;
        } else if (error) {
            this.ErrorToastmsg(error);
        }
    }

    //Handling payWage button
    handleClickPayWage(event){
        if (this.ExtraAmtWage === 0) {
            AmountPayWage.open({
                onsubmit:(event)=>{
                    this.handleAmountPay(event);
                }
            })
        } else {
            this.isdisablePayWage = true;
            const message = "Pay With the Extra Amount already given !"
            console.log(message);
            this.WarningToastmsg(message);
        }
    }

    //Handling PayWageExtraAmt button
    handleClickPayWageExtraAmt(){
        if (this.ExtraAmtWage > 0) {
            this.AllocateAmount(this.ExtraAmtWage,this.ExtraAmtWageId,true);
        } else {
            this.isdisablePayWage = true;
            const message = "Pay With the Extra Amount already given !"
            console.log(message);
            this.WarningToastmsg(message);
        }
    }

    async handleAmountPay(event){
        this.isdisablePayWage = true;
        this.IsUndopopover = true;
        let isAmountRecCreated = false;
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsUndopopover = false;
        },4500);
        this.RecCreTimeoutId = setTimeout(async () => {
            const currentDate = new Date();
            const formattedTime = currentDate.toISOString();
            const fields = {
                AccountId__c : this.recordId,
                Amount__c : event.detail.amount,
                AmountPaidTime__c : formattedTime,
                ModeOfPay__c : event.detail.modeofpay,
                Type__c : "Wage"
            }
            const recordInput = { apiName: 'Amount__c' , fields}
            const AmountPaid = event.detail.amount;
            let AmountPaidId;
            await createRecord(recordInput)
            .then(result=>{
                AmountPaidId = result.id;
                this.isAmountRecCreated = true;
                const msg = "Amount Paid Successfully : "+event.detail.amount;
                console.log(msg);
                this.SuccessToastmsg(msg);
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
            })

            if (isAmountRecCreated) {
                this.AllocateAmount(AmountPaid,AmountPaidId,false);
            }
            
            //Account Updation for TotalSalary balance
            this.TotalBalanceWage =  (parseFloat(this.TotalBalanceWage) - parseFloat(Amount)).toFixed(2);
            const Accfields = {Id: this.recordId,SalaryBalance__c:this.TotalBalanceWage}
            console.log("Account rec upd fields",Accfields);
            const AccrecInput = { Accfields };
            await updateRecord(AccrecInput)
            .then(result =>{
                const message = "Account Record Updated";
                console.log(message);
                })
            .catch(error =>{
                const message = "Account Record Updation Error"+error;
                console.error(message);
            })
        },5000);  
    }
    

    async AllocateAmount(amount,id,isExtraAmtallocation){
        let Amount = amount;
        let ID = id;
        this.CalculateWagesRecords.filter(record => record.BalanceSalary__c > 0);
        console.log("this.CalculateWagesRecords.filter(record => record.BalanceSalary__c > 0)",this.CalculateWagesRecords.filter(record => record.BalanceSalary__c > 0));
        for (let index = this.CalculateWagesRecords.length -1; index > 0 ; index--) {       // We reversely accessing the records to pay the records that are created 1st because the array we are accessing is in descending order
            let BalanceSalary = this.CalculateWagesRecords[index].BalanceSalary__c;
            let  AllocAmt;
            if(Amount === 0){
                const message = "Amount Allocated";
                console.log(message);
                this.SuccessToastmsg(message);
                return;
            }
            else if(Amount > BalanceSalary){
                AllocAmt = BalanceSalary;
                Amount  = (parseFloat(Amount) - parseFloat(BalanceSalary)).toFixed(2);        
            }
            else if(Amount === BalanceSalary){
                AllocAmt = BalanceSalary;
                Amount = 0 ;
            }
            else{
                AllocAmt = (parseFloat(BalanceSalary) - parseFloat(Amount)).toFixed(2);
                Amount = 0;
            }
                const currentDate = new Date();
                const formattedTime = currentDate.toISOString();
                const AllocAmtRecFields = {
                    AmountAllocationTime__c: formattedTime,
                    AccountId__c : this.recordId,
                    AmountId__c : ID,
                    AllocationAmount__c : AllocAmt,
                    CalculateWageId__c : this.CalculateWagesRecords[index].Id,
                }
                console.log("AmountAllocation rec upd fields",AllocAmtRecFields);
                const recordInput = {apiName: 'AmountAllocation__c', fields: AllocAmtRecFields};
                await createRecord(recordInput)
                .then(result =>{
                    const message = "Amount Allocated";
                    console.log(message);
                    this.SuccessToastmsg(message);
                })
                .catch(error =>{
                    console.error("Amount Allocation Error",error);
                    this.ErrorToastmsg(error);
                })
                //CalculateWage record Updation
                const paidSalary = (parseFloat(this.CalculateWagesRecords[index].PaidSalary__c) + parseFloat(AllocAmt)).toFixed(2)
                const fields = {Id: this.CalculateWagesRecords[index].Id, PaidSalary__c: paidSalary};
                console.log("CalculatWage rec upd fields",fields);
                const recInput = { fields };
                await updateRecord(recInput)
                .then(result =>{
                    const message = "CalculateWage Record Updated";
                    console.log(message);
                })
                .catch(error =>{
                    const message = "CalculateWage Record Updation Error"+error;
                    console.error(message);
                })

                if(Amount != 0){
                    //We have to Update in ExtraWage Amount
                    this.ExtraAmtWage = parseFloat(Amount);
                    this.ExtraAmtWageId = ID;
                    const Accfields = {Id: this.recordId,ExtraAmtWage__c: this.ExtraAmtWage, ExtraAmtWageId__c: ID}
                    console.log("Account rec upd fields",Accfields);
                    const recInput = { Accfields };
                    updateRecord(recInput)
                    .then(result =>{
                        const message = "Account Record Updated";
                        console.log(message);
                    })
                    .catch(error =>{
                        const message = "Account Record Updation Error"+error;
                        console.error(message);
                    })
                }
                if(isExtraAmtallocation){
                    this.ExtraAmtWage = 0;
                    this.ExtraAmtWageId = null;
                    const Accfields = {Id: this.recordId,ExtraAmtWage__c: 0, ExtraAmtWageId__c: null}
                    console.log("Account rec upd fields",Accfields);
                    const recInput = { Accfields };
                    updateRecord(recInput)
                    .then(result =>{
                        const message = "Account Record Updated";
                        console.log(message);
                    })
                    .catch(error =>{
                        const message = "Account Record Updation Error"+error;
                        console.error(message);
                    })
                }
        }
    }

    //Time Calculation
    getDateandTime(){
        const currentDate = new Date();
                const options = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true 
                } 
            const time = currentDate.toDateString('en-US', options);
            return time;
    }

    //All Types of Toast messages
    WarningToastmsg(message){
        this.dispatchEvent(new ShowToastEvent({
            title: "Warning",
            message: message,
            variant: "warning"
        }))
      }
      SuccessToastmsg(message){
        this.dispatchEvent(new ShowToastEvent({
            title: "Info",
            message: message,
            variant: "info"
        }));
      }
    ErrorToastmsg(error){
        let errorMessage = 'Unknown error';
              try {
                if (Array.isArray(error.body)) {
                    errorMessage = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    errorMessage = error.body.message;
                }
                dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
              } catch (error) {
                dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
              }
              
      }
}