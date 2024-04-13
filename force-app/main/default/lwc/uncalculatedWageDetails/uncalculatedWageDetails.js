import { LightningElement,api,track,wire } from 'lwc';
import AmountPayWage from 'c/amountPayWage';
import { createRecord , getRecord} from 'lightning/uiRecordApi';
import  EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import  EXTRA_AMOUNT_ID from '@salesforce/schema/Account.ExtraAmtWageId__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CalculatWageModal from 'c/calculatWageModal';
import {CreateRecorc,HandleUpdate} from 'c/recordCreationUpdationCancelUtility';
import UpdateTowelOrRawMaterialWeight from '@salesforce/apex/UpdateRecords.UpdateTowelOrRawMaterialWeight';
export default class UncalculatedWageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    @api recordId;
    @track RecCreTimeoutId;
    @track isExtraAmtlimitReached;
    @track IsUndopopover = false;
    @track ExtraAmtWage;
    @track ExtraAmtWageId;
    @track isCalculatewage;

    @wire(getRecord, { recordId: "$recordId", fields: [EXTRA_AMOUNT,EXTRA_AMOUNT_ID] })      
    wiredData({ error, data }) {
        if (data) {
            this.ExtraAmtWage = data.fields['ExtraAmtWage__c'].value;
            this.ExtraAmtWageId = data.fields['ExtraAmtWageId__c'].value;
        } else if (error) {
            this.ErrorToastmsg(error);
        }
    }

    handleClickExtAmtWagePay(){
        //It pays the wage without calculating the salary it is added to ExtAmtWage in acc record
        if (this.ExtraAmtWage < 5000) {            //here we settng limit to pay extamt
            let limit = 5000 - parseFloat(this.ExtraAmtWage);
            AmountPayWage.open({
                limitamount : limit,
                onsubmit:(event)=>{
                    this.handleExtAmountRecCreate(event);
                }
            })
        }
        else{
            this.isExtraAmtlimitReached = true;
            const message = "Exta Amount Wage Limit Reached";
            this.WarningToastmsg(message);
        }

    }

    handleExtAmountRecCreate(event){
        this.isExtraAmtlimitReached = true;     //Here we disable the button to avoid continous clicks
        this.IsUndopopover = true;
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsUndopopover = false;
        },4500);
        this.RecCreTimeoutId = setTimeout(() => {
            const fields = {
                AccountId__c : this.recordId,
                Amount__c : event.detail.amount,
                ModeOfPay__c : event.detail.modeofpay,
                Type__c : "Wage"
            }
            const recordInput = { apiName: 'Amount__c' , fields}
            CreateRecorc(recordInput)
            .then(result=>{
                const msg = "Amount Record Created";
                console.log(msg);
                this.SuccessToastmsg(msg);
                this.isExtraAmtlimitReached = false;        //Here we enable the button after rec creation 
                //Account Updation of Extra AmtWage
                this.ExtraAmtWage = parseFloat(this.ExtraAmtWage) + parseFloat(event.detail.amount)
                const Accfields = {
                    Id:this.recordId,
                    ExtraAmtWage__c : this.ExtraAmtWage
                }
                HandleUpdate(Accfields)
                .then(result =>{
                    const msg = "Account Record Updated";
                    console.log(msg);
                    this.SuccessToastmsg(msg);
                })
                .catch(error =>{
                    console.log("Account updation Error",error);
                    this.ErrorToastmsg(error);
                })
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
                this.isExtraAmtlimitReached = false;
            })
        }, 5000);
    }

    handleCalculateSalary(event){
        console.log(JSON.stringify(this.wagedetails))
        console.log(this.wagedetails.length);
        if(this.wagedetails.length !=0) {
            this.isCalculatewage = true;
            let TotalWageCalc = 0;
            let TotalDeducCalc = 0;
            let TotalSalaryCalc = 0;
            let Recfields = [];       //To Update the TowelOrRawMaterialWeight object with the id of the CalculateWage record created in the WageCalculated__c to mark it as calculated
            this.wagedetails.forEach(element => {
                TotalWageCalc = parseFloat(TotalWageCalc) + parseFloat(element.DaySpecificWage__c);
                TotalDeducCalc = parseFloat(TotalDeducCalc) + parseFloat(element.DaySpecificDeduction__c);
                Recfields.push({Id:element.Id,WageCalculated__c:''});
            });
            console.log("TotalWageCalc",TotalWageCalc);
            console.log("TotalDeducCalc",TotalDeducCalc);
            if (TotalWageCalc > TotalDeducCalc) {
                TotalSalaryCalc = parseFloat(TotalWageCalc) - parseFloat(TotalDeducCalc);
                console.log("TotalSalaryCalc",TotalSalaryCalc)
                //CalculateWage Record Creation
                const fields = {CalculatedSalary__c: TotalSalaryCalc, BalanceSalary__c: TotalSalaryCalc, PaidSalary__c: 0}
                const recordInput = {apiName: 'CalculateWage__c',fields}
                CreateRecorc(recordInput)
                .then(result =>{
                    const CalculatRecId = result.id;
                    console.log("CalculatRecId",CalculatRecId);
                    const message = "CalculateWage Record Created";
                    console.log(message);
                    console.log("result.id",result.id);
                    this.SuccessToastmsg(message);

                    //Daily Records Updation
                    Recfields.forEach(element => {
                        element.WageCalculated__c = result.id;
                    });
                    UpdateTowelOrRawMaterialWeight({Records: Recfields})
                    .then(response =>{
                        if (response.isSuccess) {
                            const message = "Calculation Updated in Daily Records";
                            console.log(message);
                            //this.SuccessToastmsg(message);

                            // Updation Salary
                            this.TotalBalanceWage = parseFloat(this.TotalBalanceWage) + parseFloat(TotalSalaryCalc);
                            const fields = {Id:this.recordId,SalaryBalance__c:this.TotalBalanceWage};
                            HandleUpdate(fields)
                            .then(result =>{
                                const message = "Account Updated ";
                                console.log(message);
                                //this.SuccessToastmsg(message);
                                //Cache Updation
                                this.wagedetails = [];
                                this.isCalculatewage = true;

                                //Modal open
                                CalculatWageModal.open(
                                    {
                                        calculaterecid : CalculatRecId,
                                        onsubmit:(event)=>{
                                            this.handleCalculateWagePay(event);
                                        }
                                    }
                                )
                            })
                            .catch(error =>{
                                const message = "Account Updation error ";
                                console.error(message+error);
                            })
                            
                        } else {
                            const message = "Calculation Updation Error in Daily Records "+response.message;
                            console.log(message);
                            this.WarningToastmsg(message);
                            this.isCalculatewage = false;
                        }
                    })
                })
                .catch(error =>{
                    console.error("CalculateWage Record Creation error:",error);
                    this.ErrorToastmsg(error);
                    this.isCalculatewage = false;
                })
            } else {
                const message = "Cannot Able to Calculate Wage Deduction greater than Wage"
                this.WarningToastmsg(message);
                this.isCalculatewage = false;
            }

        }
        else {
            this.isCalculatewage = true;
            const message = "No records for Calculation";
            console.log(message);
            this.WarningToastmsg(message);
        }
        
    }
    handleCalculateWagePay(event){
        const CalculateRecId = event.detail.recid;
        AmountPayWage.open({
            onsubmit:(event)=>{
                this.handleAmountPay(event);
            }
        })
    }
    handleAmountPay(event){
        this.IsUndopopover = true;
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsUndopopover = false;
        },4500);
        this.RecCreTimeoutId = setTimeout(() => {
            const fields = {
                AccountId__c : this.recordId,
                Amount__c : event.detail.amount,
                ModeOfPay__c : event.detail.modeofpay,
                Type__c : "Wage"
            }
            const recordInput = { apiName: 'Amount__c' , fields}
            CreateRecorc(recordInput)
            .then(result=>{
                const msg = "Amount Record Created";
                console.log(msg);
                this.SuccessToastmsg(msg);
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
            })
        },5000);  
    }
    
  triggerCancelAmountRecCreation(){
    this.IsUndopopover = false;
    this.HandleCancelRecCreation(this.RecCreTimeoutId);
    this.isExtraAmtlimitReached = false;        //Enabling the button after process completion
  }
  HandleCancelRecCreation(TimeoutRecCreId){
    clearTimeout(TimeoutRecCreId);
    const message =  `Record Creation has been canceled `;
    this.WarningToastmsg(message);
    this.RecCreTimeoutId = null;
  }

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
  }
}