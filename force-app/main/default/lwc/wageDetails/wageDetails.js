import { LightningElement,api,track } from 'lwc';
import AmountPay from 'c/amountPay';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class WageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    @track AmtRecCreTimeoutId;
    @track IsUndopopover = false;
    @api recordId;
    @track child;
    @track notpaid = [];

    connectedCallback(){
        this.wagedetails.forEach(record => {
            if(record.TowelOrRawMaterialWeightDetails__r){
                record.TowelOrRawMaterialWeightDetails__r.forEach(currentItem => {
                    if(!currentItem.WageAmountId__c){
                        this.notpaid.push(currentItem);
                    }
                });
            }
        });
        console.log("this.notpaid",JSON.stringify(this.notpaid));
    }
    handleClickWagePay(){
        AmountPay.open(
            {
                onsubmit:(event)=>{
                    console.log("Entered submit");
                        const amount = event.detail.amount;
                        const amttype = event.detail.amttype;
                        console.log("amount",amount);
                        console.log("amttype",amttype);
                        const fields = {
                            Amount__c : amount,
                            Type__c : amttype,
                            Account_Name__c : this.recordId
                        }
                        const RecInput = {apiName : 'Amount__c',fields};
                        console.log("RecInput",RecInput);
                        this.IsUndopopover = true;
                        console.log("IsUndopopover",this.IsUndopopover);
                        setTimeout(()=>{
                            this.IsUndopopover = false;
                            console.log("IsUndopopover",this.IsUndopopover);
                        },4500);
    
                        this.AmtRecCreTimeoutId = setTimeout(() =>{
                            this.CreateNewRecord(RecInput)
                            .then(result =>{
                            console.log("Amount Record Created")
                                this.notpaid.forEach(recc => {l})
                            })
                            .catch(error=>{
                                console.error("Amount Record Creation error:",error);
                            })
                    },5000);
                }
            }
        )
    }





    triggerCancelAmountRecCreation(){
        this.IsUndopopover = false;
        clearTimeout(this.AmtRecCreTimeoutId);
        this.dispatchEvent(new ShowToastEvent({
            title: "Success",
            message: "Amount Record Creation has been cancelled",
            variant: "success"
        }));
    }

    CreateNewRecord(RecInput){
        return createRecord(RecInput)
        .then(result =>{
            this.dispatchEvent(new ShowToastEvent({
                title: "Success",
                message: "Record Created Successfully",
                variant: "success"
            }));
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
        })
    }
}