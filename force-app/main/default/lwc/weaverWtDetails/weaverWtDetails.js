import { LightningElement,api,track, wire } from 'lwc';
import CUSTOM_OBJECT from '@salesforce/schema/TowelOrRawMaterialWeight__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CreateTowWtDetails from '@salesforce/apex/CreateWtDetails.CreateTowWtDetails';

export default class WeaverWtDetails extends LightningElement {
    @api wtdetails;               //We get the records of Type "Normal or Black or 6666" for the current account to check for record creation
    @api recordId;              //current Account Id
    @api type;                   //Current account's related TowelDetails object type
    @track account;              // Current account fields and values
    @track isaddTowel = false;
    @track CurrentDateRecId;   //Current date record id 
    @track disableCreate;
    @track WtTypeField; 
    @track formattedDate
    connectedCallback(){
        this.WtTypeField = `Pending_Wt_${this.type}__c`;

        const currentDate = new Date();
        // Get year, month, and day
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Add 1 because month is zero-based
        const day = String(currentDate.getDate()).padStart(2, '0');
        // Format date as YYYY-MM-DD
         this.formattedDate = `${year}-${month}-${day}`;
         this.disableCreate = false;
        if (this.wtdetails != null) {
            this.wtdetails.forEach(record =>{
                const recordDate = record.Date__c;
                if(recordDate === this.formattedDate){            // We check if there is record already  created for the current date
                    this.disableCreate = true;
                    this.CurrentDateRecId = record.Id;
                }
            });
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$WtType' })
    wiredData({ error, data }) {
        if (data) {
            this.account = data.fields[this.WtTypeField].value;
        } else if (error) {
            console.error('Error:', error);
        }
    }

    
    handleClickCreateRec(event){
            const fields = {
                AccountId__c : this.recordId,
                Date__c : this.formattedDate,
                [`DaySpecific${this.type}BalanceWt__c `] : this.account,
                DaySpecificDeduction__c : 0,
                DaySpecificWage__c : 0,
                TowelWeightType__c : this.type
            };
            const recordInput = { apiName: 'TowelOrRawMaterialWeight__c' , fields};
            createRecord(recordInput)
            .then(result=>{
                this.dispatchEvent(new ShowToastEvent({
                    title: "Info",
                    message: `Today's record is created`,
                    variant: "info"
                }));
                this.disableCreate = true;
                this.CurrentDateRecId = result.id;
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

 

 handleClickAddTow(){
    this.isaddTowel = true;
 }


 handleTowelsSubmit(event){
    this.isaddTowel = false;
    const towels = event.detail.towels;
    

    towels.forEach(record=>{
        const fields = {
            TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
            Particulars__c : record.Particulars__c,
            Quantity__c : record.Quantity__c,
            TowelWeight__c : record.TowelWeight__c
        };
        const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields};
        createRecord(recordInput)
            .then(result=>{
                this.dispatchEvent(new ShowToastEvent({
                    title: "Info",
                    message: `Towel Detail's is Updated`,
                    variant: "info"
                }));
            })
            .catch(error=>{
                this.dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: ' Error Occured ',
                    variant: "error"
                }));
            });
    });


    // CreateTowWtDetails(TowDetails,this.CurrentDateRecId)
    // .then(result=>{
    //     this.dispatchEvent(new ShowToastEvent({
    //         title: "Info",
    //         message: `Towel Details Updated`,
    //         variant: "info"
    //     }));
    // })
    // .catch(error=>{
    //     let errorMessage = 'Unknown error';
    //             if (Array.isArray(error.body)) {
    //                 errorMessage = error.body.map(e => e.message).join(', ');
    //             } else if (typeof error.body.message === 'string') {
    //                 errorMessage = error.body.message;
    //             }
    //             this.dispatchEvent(new ShowToastEvent({
    //                 title: "Error",
    //                 message: errorMessage,
    //                 variant: "error"
    //             }));
    // });
 }
 handleCancel(){
    this.isaddTowel = false;
 }

}