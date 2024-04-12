import { LightningElement,api,track,wire } from 'lwc';
import AmountPayWage from 'c/amountPayWage';
import { createRecord , getRecord} from 'lightning/uiRecordApi';
import  EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import  EXTRA_AMOUNT_ID from '@salesforce/schema/Account.ExtraAmtWageId__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {CreateRecorc,HandleUpdate} from 'c/recordCreationUpdationCancelUtility';
export default class UncalculatedWageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    @api recordId;
    @track RecCreTimeoutId;
    @track isExtraAmtlimitReached;
    @track IsUndopopover = false;
    @track ExtraAmtWage;
    @track ExtraAmtWageId;

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
                    this.handleAmountRecCreate(event);
                }
            })
        }
        else{
            this.isExtraAmtlimitReached = true;
            const message = "Exta Amount Wage Limit Reached";
            this.WarningToastmsg(message);
        }

    }

    handleAmountRecCreate(event){
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
            CreateRecorc(recordInput,this.dispatchEvent)
            .then(result=>{
                const msg = "Amount Record Created";
                console.log(msg);
                this.SuccessToastmsg(msg);
                this.isExtraAmtlimitReached = false;        //Here we enable the button after rec creation 
                //Account Updation of Etra AmtWage

            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
                this.isExtraAmtlimitReached = false;
            })
        }, 5000);
    }

    handleCalculateRecCreate(event){
        const fields = {
            
        }
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