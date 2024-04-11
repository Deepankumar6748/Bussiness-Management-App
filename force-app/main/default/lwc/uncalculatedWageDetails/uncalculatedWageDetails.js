import { LightningElement,api,track,wire } from 'lwc';
import AmountPayWage from 'c/amountPayWage';
import { createRecord , getRecord} from 'lightning/uiRecordApi';
import  EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import  EXTRA_AMOUNT_ID from '@salesforce/schema/Account.ExtraAmtWageId__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
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
            let errorMessage = 'Unknown error';
                if (Array.isArray(error.body)) {
                    errorMessage = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    errorMessage = error.body.message;
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
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
            this.isExtraAmtlimitReached = false;
            this.dispatchEvent(new ShowToastEvent({
                title: "Waning",
                message: "Exta Amount Wage Limit Reached",
                variant: "warning"
            }));
        }

    }

    handleAmountRecCreate(event){
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
            this.CreateRecorc(recordInput)
            .then(result=>{
                console.log("Amount Record Created");
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
            })
        }, 5000);
    }

    handleCalculateRecCreate(event){
        const fields = {
            
        }
    }

    //Creation of record
    CreateRecorc(recordInput){
        return createRecord(recordInput)
          .then(result=>{
              this.dispatchEvent(new ShowToastEvent({
                  title: "Info",
                  message: `Record has been created`,
                  variant: "info"
              }));
              return result;
          })
          .catch(error=>{
              let errorMessage = 'Unknown error';
              if (Array.isArray(error.body)) {
                  errorMessage = error.body.map(e => e.message).join(', ');
              } else if (typeof error.body.message === 'string') {
                  errorMessage = error.body.message;
              }
              this.dispatchEvent(new ShowToastEvent({
                  title: "Error",
                  message: errorMessage,
                  variant: "error"
              }));
              throw error;
          });
  }
  triggerCancelAmountRecCreation(){
    this.IsUndopopover = false;
    this.HandleCancelRecCreation(this.RecCreTimeoutId);
  }
  HandleCancelRecCreation(TimeoutRecCreId){
    clearTimeout(TimeoutRecCreId);
    this.dispatchEvent(new ShowToastEvent({
        title: 'Info',
        message: `Record Creation has been canceled `,
        varient : 'warning'
    }));
    this.RecCreTimeoutId = null;
}
}