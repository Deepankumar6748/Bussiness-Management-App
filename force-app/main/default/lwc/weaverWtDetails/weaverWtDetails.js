import { LightningElement,api,track, wire } from 'lwc';
import CUSTOM_OBJECT from '@salesforce/schema/TowelOrRawMaterialWeight__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CreateTowWtDetails from '@salesforce/apex/CreateWtDetails.CreateTowWtDetails';

export default class WeaverWtDetails extends LightningElement {
    @api wtdetails;               //We get the records of Type "Normal or Black or 6666" for the current account to check for record creation
    @api recordId;              //current Account Id
    @api type;                   //Current account's related TowelDetails object type
    @track WtTypeFieldValue;              // Current account WtTypeFieldValue
    @track isaddTowel = false;
    @track CurrentDateRecId;   //Current date record id 
    @track disableCreate;
    @track WtTypeField;         //Initializing this variable to identify the current weightType field to return the pending Weieght so far 
    @track formattedDate;
    @track IsOpenPopup = false;   //Initially The Undo Popup is set to be false
    @track TimeoutRecCreId;
    connectedCallback(){
        this.WtTypeField = `Pending_Wt_${this.type}__c`;    //By recognizing the weight type we assign the WtTypeField for accessing the values

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
    message;

    //To get the Current Account Details for Updating and using of the fields to maintain the weight balance and all related field values updation 
    @wire(getRecord, { recordId: '$recordId', fields: '$this.WtTypeField' })      //WtType
    wiredData({ error, data }) {
        if (data) {
            this.WtTypeFieldValue = data.fields[this.WtTypeField].value;    //From the fetched record we access the value of the field and stored in the variable
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

    //To create the Current Date Record
    handleClickCreateRec(){
            const fields = {
                AccountId__c : this.recordId,
                Date__c : this.formattedDate,
                [`DaySpecific${this.type}BalanceWt__c `] : this.WtTypeFieldValue,
                DaySpecificDeduction__c : 0,
                DaySpecificWage__c : 0,
                TowelWeightType__c : this.type
            };

            const recordInput = { apiName: 'TowelOrRawMaterialWeight__c' , fields};
            this.IsOpenPopup = true;                //Set the popup open when the button is clicked
            setTimeout(()=>{                        //Setting the timeout for Undo Popup
                this.IsOpenPopup = false;
            },4500);
            let CurrentDateRecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
            CurrentDateRecCreId = setTimeout(() => {
                this.CreateRecorc(recordInput);
            }, 5000);
            this.TimeoutRecCreId =  CurrentDateRecCreId; //Assigning the Timeoutid to cancel the particular Timeout
    }
   
    //To Open Pop-up Window for the addition of Towel Details
    handleClickAddTow(){
        if (this.disableCreate) {
            this.isaddTowel = true;
        }else{
            this.handleClickCreateRec();
            this.isaddTowel = true;
        }
        
    }

    //Handling Addition of Towel Details for current Date
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
            this.IsOpenPopup = true;                //Set the popup open when the button is clicked
            setTimeout(()=>{                        //Setting the timeout for Undo Popup
                this.IsOpenPopup = false;
            },4500);
            let CurrentDateRecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
            CurrentDateRecCreId = setTimeout(() => {
                this.CreateRecorc(recordInput);
            }, 5000);
            this.TimeoutRecCreId =  CurrentDateRecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        });
 }

    //Creation of record
    CreateRecorc(recordInput){
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

    //Handling Undo Popup for creation of record
    triggerCancelRecCreation(){
        this.HandleCancelRecCreation(this.TimeoutRecCreId)
    }
    HandleCancelRecCreation(TimeoutRecCreId){
        clearTimeout(TimeoutRecCreId);
        this.dispatchEvent(new ShowToastEvent({
            title: 'Info',
            message: `Record Creation has been canceled `,
            varient : 'warning'
        }));
        this.IsOpenPopup = false;
    }

    //To Close the Add Towel Tab
    handleCancel(){
        this.isaddTowel = false;
    }

}