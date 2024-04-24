import { LightningElement ,api,track, wire} from 'lwc';
import { createRecord , getFieldValue, getRecord, updateRecord} from 'lightning/uiRecordApi';
import AmountPayWage from 'c/amountPayWage';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CalculationdetailsModal from 'c/calculationdetailsModal';
export default class CalculatedSalary extends LightningElement {
    @api CalculateWagesRecords;
    @api recordId;
    @api TotalBalanceWage;
    @track isdisablePayWage;
    @track isdisablePayWageExtraAmt;
    @track isDisableButtons;
    @api ExtraAmtWage;
    @api ExtraAmtWageId;
    
    renderedCallback(){

        if(this.ExtraAmtWage === 0){
            this.isdisablePayWageExtraAmt = true;
            this.isdisablePayWage = false;
        }
        else{
            this.isdisablePayWageExtraAmt = false;
            this.isdisablePayWage = true;
        }
    }
    connectedCallback(){
        this.CalculateWagesRecords = JSON.parse(JSON.stringify(this.CalculateWagesRecords));
    }
    //Handling payWage button
    handleClickPayWage(event){
        this.isDisableButtons = true;
        if (this.ExtraAmtWage === 0) {
            AmountPayWage.open({
                onsubmit:(event)=>{
                    this.handleAmountPay(event);
                }
            })
        } else {
            this.isdisablePayWage = true;
            this.isdisablePayWageExtraAmt = false;
            const message = "Pay With the Extra Amount already given !"
            console.log(message);
            this.WarningToastmsg(message);
        }
    }

    //Handling PayWageExtraAmt button
    handleClickPayWageExtraAmt(){
        this.isDisableButtons = true;
        if (this.ExtraAmtWage > 0) {
            this.AllocateAmount(this.ExtraAmtWage,this.ExtraAmtWageId,true);
        } else {
            this.isdisablePayWageExtraAmt = true;
            this.isdisablePayWage = false;
            const message = "There is no ExtrWage Amount !"
            console.log(message);
            this.WarningToastmsg(message);
        }
    }


    handleShowdetails(event){
        const {calcid} = event.currentTarget.dataset;
        console.log("clicked"+calcid)
        CalculationdetailsModal.open({
            calculationid : calcid
        })
    }

    async handleAmountPay(event){
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
                isAmountRecCreated = true;
                const msg = "Amount Paid Successfully : "+event.detail.amount;
                console.log(msg);
                this.SuccessToastmsg(msg);
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
            })

            //Account Updation for TotalSalary balance
            const totalbalancewage =  (parseFloat(this.TotalBalanceWage) - parseFloat(AmountPaid)).toFixed(2);
            const Accfields = {Id: this.recordId,SalaryBalance__c: totalbalancewage}
            console.log("Account rec upd fields",Accfields);
            const AccrecInput = { fields:Accfields };
            await updateRecord(AccrecInput)
            .then(result =>{
                this.TotalBalanceWage = totalbalancewage;
                const message = "Account Record Updated";
                console.log(message);
                })
            .catch(error =>{
                const message = "Account Record Updation Error"+error;
                console.error(message);
            })


            if (isAmountRecCreated) {
                console.log("AmountPaid",AmountPaid);
                this.AllocateAmount(AmountPaid,AmountPaidId,false);
            }

        },5000);  
    }
    

    async AllocateAmount(amount,id,isExtraAmtallocation){
        let Amount = amount;
        console.log("Amount",Amount);
        let ID = id;
        const Filteredrecords =  this.CalculateWagesRecords.filter(record => record.BalanceSalary__c > 0);
        console.log("Filteredrecords",JSON.stringify(Filteredrecords));
        if (Filteredrecords.length > 0) {
            for (let index = Filteredrecords.length -1; index >= 0 ; index--) {       // We reversely accessing the records to pay the records that are created 1st because the array we are accessing is in descending order
                console.log("index",index);
                console.log(" Filteredrecords[index]", JSON.stringify(Filteredrecords[index]));
                let isAmountAllocated = false;
                let BalanceSalary = Filteredrecords[index].BalanceSalary__c;
                console.log("BalanceSalary",BalanceSalary);
                let  AllocAmt;
                if(Amount == 0){
                    console.log("break;")
                    break;
                }
                else if(Amount >= BalanceSalary){
                    AllocAmt = BalanceSalary; 
                    console.log("AllocAmt",AllocAmt);       
                }
                else if (Amount < BalanceSalary){
                    AllocAmt = parseFloat(Amount).toFixed(2);
                    console.log("AllocAmt",AllocAmt); 
                }
                    const currentDate = new Date();
                    const formattedTime = currentDate.toISOString();
                    const AllocAmtRecFields = {
                        AmountAllocationTime__c: formattedTime,
                        AccountId__c : this.recordId,
                        AmountId__c : ID,
                        AllocationAmount__c : AllocAmt,
                        CalculateWageId__c : Filteredrecords[index].Id,
                    }
                    console.log("AmountAllocation rec upd fields",JSON.stringify(AllocAmtRecFields));
                    const recordInput = {apiName: 'AmountAllocation__c', fields: AllocAmtRecFields};
                    await createRecord(recordInput)
                    .then(result =>{
                        isAmountAllocated = true;
                        Amount  = (parseFloat(Amount) - parseFloat(AllocAmt)).toFixed(2);
                        console.log("Amount",Amount);
                        const message = "Amount Allocated";
                        console.log(message);
                        this.SuccessToastmsg(message);
                    })
                    .catch(error =>{
                        isAmountAllocated = false;
                        console.error("Amount Allocation Error",error);
                        this.ErrorToastmsg(error);
                        this.isDisableButtons = false;
                        return;
                        
                    })
    
                    if (isAmountAllocated) {
                        //CalculateWage record Updation
                        const paidSalary = (parseFloat(Filteredrecords[index].PaidSalary__c) + parseFloat(AllocAmt)).toFixed(2)
                        const fields = {Id: Filteredrecords[index].Id, PaidSalary__c: paidSalary};
                        console.log("CalculatWage rec upd fields",JSON.stringify(fields));
                        const recInput = { fields };
                        await updateRecord(recInput)
                        .then(result =>{
                            //To update the main records in that is retrieved
                            try {
                                this.CalculateWagesRecords.find(ele => ele.Id === Filteredrecords[index].Id).PaidSalary__c = paidSalary;
                                this.CalculateWagesRecords.find(ele => ele.Id === Filteredrecords[index].Id).BalanceSalary__c = (parseFloat(BalanceSalary) - parseFloat(AllocAmt)).toFixed(2);
                                // console.log("this.CalculateWagesRecords.find(ele => ele.Id === Filteredrecords[index].Id).PaidSalary__c = paidSalary;",paidSalary);
                                // console.log("this.CalculateWagesRecords.find(ele => ele.Id === Filteredrecords[index].Id).BalanceSalary__c = (parseFloat(BalanceSalary) - parseFloat(paidSalary)).toFixed(2);",(parseFloat(BalanceSalary) - parseFloat(paidSalary)).toFixed(2))
                                const message = "CalculateWage Record Updated";
                                console.log(message);
                            } catch (error) {
                                console.error("allocerror",error);
                                this.ErrorToastmsg(error)
                            }
                        })
                        .catch(error =>{
                            const message = "CalculateWage Record Updation Error"+error;
                            console.error(error);
                        })
                    }
            }
            console.log("Amount",Amount);
            console.log("isExtraAmtallocation",isExtraAmtallocation);
            if(isExtraAmtallocation || Amount > 0){
                //We have to Update in ExtraWage Amount
                let extraamtwage = parseFloat(Amount);
                let extraamtwageId;
                if(extraamtwage === 0){
                    extraamtwageId = null;
                }
                else{
                    extraamtwageId = ID;
                }
                const Accfields = {Id: this.recordId,ExtraAmtWage__c: extraamtwage, ExtraAmtWageId__c: extraamtwageId}
                console.log("Account rec upd fields",JSON.stringify(Accfields));
                const recInput = { fields:Accfields };
                updateRecord(recInput)
                .then(result =>{
                    this.ExtraAmtWage = extraamtwage;
                    this.ExtraAmtWageId = extraamtwageId;
                    const message = "Account Record Updated";
                    console.log(message);
                })
                .catch(error =>{
                    const message = "Account Record Updation Error"+error;
                    console.error(message);
                })
            }
            
        } else {
            const message = "No records for Amount allocation";
            console.log(message);
            this.WarningToastmsg(message);
        }
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