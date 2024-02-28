import { LightningElement,api,track } from 'lwc';
import CUSTOM_OBJECT from '@salesforce/schema/TowelOrRawMaterialWeight__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class WeaverWtDetails extends LightningElement {
    @api wtdetails;               //We get the records of Type "Normal or Black or 6666" for the current account to check for record creation
    @api type;                   //Current account's related TowelDetails object type
    @api recordId;              //current Account Id
    @api account;              // Current account fields and values
    @track isaddTowel = false;
    @track CurrentDateRecId;   //Current date record id 
    handleClickCreateRec(event){
        const button = event.target;
        const date = new Date();
        this.wtdetails.forEach(record =>{
            const recordDate = new Date(record.Date__c);
            if(recordDate.toDateString() === date.toDateString()){            // We check if there is record already  created for the current date
                button.disabled = true;
            }
        });

        if(button.disabled){
            this.dispatchEvent(new ShowToastEvent({
                title: "Info",
                message: `Today's record is already created.`,
                variant: "info"
            }));
            console.log(`Today's record is created already`);
        }
        else{
            const fields = {
                AccountId__c : this.recordId,
                Date__c : new Date().toDateString()
            };
            const recordInput = { apiName: TowelOrRawMaterialWeight__c , fields};

            createRecord(recordInput)
            .then(result=>{
                this.dispatchEvent(new ShowToastEvent({
                    title: "Info",
                    message: `Today's record is  created.`,
                    variant: "info"
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
            });
            
            
        }
    }

    handleClickCreate(event){
         
    }

 handleClickAddTow(){
    this.isaddTowel = true;
 }

 @track TowDetails ;
 closeAddTowTab(event){
    this.isaddTowel = false;
    this.TowDetails = event.detail.TowelDetails;
    
 }
 handleCancel(){
    this.isaddTowel = false;
 }

}