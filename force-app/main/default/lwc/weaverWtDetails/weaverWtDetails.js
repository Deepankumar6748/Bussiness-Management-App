import { LightningElement,api,track, wire } from 'lwc';
import NORMAL_FIELD from '@salesforce/schema/Account.Pending_Wt_Normal__c';
import BLACK_FIELD from '@salesforce/schema/Account.Pending_Wt_Black__c';
import PATANI_FIELD from '@salesforce/schema/Account.Pending_Wt_6666__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import AddRawMatModal from 'c/addRawMaterial';
import AddTowModal from 'c/addTowel';

export default class WeaverWtDetails extends LightningElement {
    @api wtdetails;               //We get the records of Type "Normal or Black or 6666" for the current account to check for record creation
    @api recordId;              //current Account Id
    @api type;                   //Current account's related TowelDetails object type
    @track WtTypeFieldValue;              // Current account WtTypeFieldValue
    @track CurrentDateRecId;   //Current date record id 
    @track disableCreate = false;
    @track WtTypeField;         //Initializing this variable to identify the current weightType field to return the pending Weieght so far 
    @track formattedDate;
    @track IsOpenPopupCurrDate = false;   //Initially The Undo Popup is set to be false
    @track IsOpenPopupSubmit = false;
    @track TimeoutSubmitRecCreId;
    @track TimeoutCurrentDateRecCreId;
    @track disableAddTowel = true;
    @track disableAddRawMat = true;


    connectedCallback(){
        this.WtTypeField = `Pending_Wt_${this.type}__c`;    //By recognizing the weight type we assign the WtTypeField for accessing the values
        console.log("WtTypeField:",this.WtTypeField);
        console.log("wtdetails:",this.wtdetails[0]);
        const currentDate = new Date();
        // Get year, month, and day
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Add 1 because month is zero-based
        const day = String(currentDate.getDate()).padStart(2, '0');
        // Format date as YYYY-MM-DD
         this.formattedDate = `${year}-${month}-${day}`;
        if (this.wtdetails != null) {
            this.wtdetails.forEach(record =>{
                const recordDate = record.Date__c;
                if(recordDate === this.formattedDate){            // We check if there is record already  created for the current date
                    this.disableCreate = true;
                    this.disableAddRawMat = false;
                    this.disableAddTowel = false;
                    this.CurrentDateRecId = record.Id;
                }
            });
        }
    }
    //List of Towels and its  Wage
    TowelWageDetails = [{
        '6666'              : 22.75,
        '51x102(white)'     : 12.70 ,
        '35x70'             : 9.50,
        '30x60'             : 8.25,
        '51x102(Red)'       : 12.75,
        '51x102'            : 12.75,
        '45x90(Plain Red)'  : 20.60,
        '45x90(Plain)'      : 20.60,
        '45x90(Light color)': 20.60,
        '45x90'             : 20.60,
        '50x100'            : 20.60,
        '70x140'            : 22.75, 
        '70x140(Plain Red)' : 22.75,
        '70x140(Plain)'     : 22.75,
        '75x150'            : 22.75
    }];
    //To get the Current Account Details for Updating and using of the fields to maintain the weight balance and all related field values updation 
    @wire(getRecord, { recordId: "$recordId", fields: [NORMAL_FIELD,BLACK_FIELD,PATANI_FIELD] })      //WtType
    wiredData({ error, data }) {
        if (data) {
            this.WtTypeFieldValue = data.fields[`Pending_Wt_${this.type}__c`].value;    //From the fetched record we access the value of the field and stored in the variable
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
        this.disableCreate = true;          //Here we initially disable the button when clicked to avoid duplicate record creation
            const fields = {
                AccountId__c : this.recordId,
                Date__c : this.formattedDate,
                [`DaySpecific${this.type}BalanceWt__c`] : this.WtTypeFieldValue,
                DaySpecificDeduction__c : 0,
                DaySpecificWage__c : 0,
                TowelWeightType__c : this.type
            };
            console.log("this.WtTypeFieldValue:",this.WtTypeFieldValue);
            const recordInput = { apiName: 'TowelOrRawMaterialWeight__c' , fields};
            this.IsOpenPopupCurrDate = true;                //Set the popup open when the create Date button is clicked
            setTimeout(()=>{                        //Setting the timeout for Undo Popup
                this.IsOpenPopupCurrDate = false;
            },4500);
            let RecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
            RecCreId = setTimeout(() => {
                this.CreateRecorc(recordInput)
                .then(result=>{
                    this.disableCreate = true;
                    this.disableAddRawMat = false;
                    this.disableAddTowel = false;
                    this.CurrentDateRecId = result.id;
                })
                .catch(error =>{
                    this.disableCreate = false;         //If there is any error then the button is restored
                    console.error(error);
                });
            }, 5000);
            this.TimeoutCurrentDateRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
            
    }
   
    //To Open modal Window for the addition of Towel Details
    handleClickAddTow(){
            AddTowModal.open({
                onsubmit:(event)=>{
                    this.handleTowelsSubmit(event);
                }
            });
    }

    //To Open modal Window for the addition of RawMaterials Details
    handleClickAddRawMat(){
            AddRawMatModal.open({
                onsubmit:(event)=>{
                    this.handleRawMaterialsSubmit(event);
                }
            });   
    }


    //Handling Addition of Towel Details for current Date
    handleTowelsSubmit(event){
        const towelsWOrWoDp = event.detail.towels;   //   towelsWOrWoDp => towelsWithOrWithoutDuplicates

        //We have to process the list for duplicate values
        for (let i = 0; i < towelsWOrWoDp.length; i++) {
            let count = 0;
            let DuplicateInd = [];
            console.log("DuplicateInd",DuplicateInd);
            for (let j = 0 ; j < towelsWOrWoDp.length; j++) {
                if(towelsWOrWoDp[i].Particulars === towelsWOrWoDp[j].Particulars){
                    count++;
                    console.log("count",count);
                    if (count>1) {                  //We iterate through the array to check duplicates if it found then the values are added to give a single record
                        towelsWOrWoDp[i].Quantity = parseInt(towelsWOrWoDp[i].Quantity) + parseInt(towelsWOrWoDp[j].Quantity);
                        towelsWOrWoDp[i].TowelWeight = parseFloat(towelsWOrWoDp[i].TowelWeight) + parseFloat(towelsWOrWoDp[j].TowelWeight);
                        DuplicateInd.push(j);       //for each iteration the value is checked to all the other values in the array if similarity found then the index of the value is noted in the array
                    }
                }
                
            }
            if(count > 1){
                DuplicateInd.forEach(Index=>{           //After every value is uniquely iterated if there is any dupicates then it is deleted from the array
                    console.log("Index",Index);
                    towelsWOrWoDp.splice(Index);
                });
            }
        }
        const towels = towelsWOrWoDp;
        console.log("towelsWOrWoDp",towelsWOrWoDp);
        const TotalWtPerSubmit = event.detail.total; 
        console.log("TotalWtPerSubmit1:",TotalWtPerSubmit);
        this.IsOpenPopupSubmit = true;                //Set the popup open when the Submit button is clicked
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsOpenPopupSubmit = false;
        },4500);
        let RecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
        RecCreId = setTimeout(() => {
            towels.forEach(record=>{
                const TowWage = parseFloat(this.TowelWageDetails.find(Element=> Element.hasOwnProperty(record.Particulars))[record.Particulars]) * parseFloat(record.Quantity);      // Accessing the wage based on the particular of the towel
                const fields = {
                    TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                    Particulars__c : record.Particulars,
                    Quantity__c : record.Quantity,
                    TowelWeight__c : record.TowelWeight,
                    Wage__c : TowWage
                };
                const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields}
                this.CreateRecorc(recordInput)
                .then(result=>{
                    //this.UpdatedValues.push(fields);
                    //console.log("UpdatedValues:",this.UpdatedValues);
                })
                .catch(error=>{
                    console.error(error);
                });
            });
            console.log("TotalWtPerSubmit2:",TotalWtPerSubmit);
            const fieldValue = this.WtTypeFieldValue - TotalWtPerSubmit;
            console.log("fieldValue:",fieldValue);
            this.WtTypeFieldValue = fieldValue;
            console.log("fieldValue update:",fieldValue);
            //Account Updation
            const Accfield = {
                Id : this.recordId,
                [`Pending_Wt_${this.type}__c`] : fieldValue,
            };
            this.HandleUpdate(Accfield)
            .then(result=>{
                console.log("UpdatedValues:",this.UpdatedValues);
            })
            .catch(error=>{
                console.error(error);
            });
            //CurrentDate Record Updation
            const CurDtRecFld = {
                Id : this.CurrentDateRecId,
                [`DaySpecific${this.type}BalanceWt__c`] : fieldValue,
            }
            this.HandleUpdate(CurDtRecFld)
            .then(result=>{
                console.log("UpdatedValues:",this.UpdatedValues);
            })
            .catch(error=>{
                console.error(error);
            });
        }, 5000);
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        
    }




    //Handling Addition of RawMaterials Details for current Date
    handleRawMaterialsSubmit(event){
        const rawmaterialsWOrWoDp = event.detail.rawmaterials;
        console.log("entered ")
        //We have to process the list for duplicate values
        // for (let i = 0;rawmaterialsWOrWoDp.length; i++) {
        //     let count = 0;
        //     let DuplicateInd = [];
        //     console.log("DuplicateInd",DuplicateInd);
        //     for (let j = 0 ; j < rawmaterialsWOrWoDp.length; j++) {
        //         if(rawmaterialsWOrWoDp[i].RawMaterial === rawmaterialsWOrWoDp[j].RawMaterial){
        //             count++;
        //             console.log("count",count);
        //             if (count>1) {
        //                 rawmaterialsWOrWoDp[i].RawMaterialWeight = parseFloat(rawmaterialsWOrWoDp[i].TowelWeight) + parseFloat(rawmaterialsWOrWoDp[j].TowelWeight);
        //                 console.log("j",j);
        //                 DuplicateInd.push(j);
        //             }
        //         }
                
        //     }
        //     DuplicateInd.forEach(Index=>{
        //         console.log("Index",Index);
        //         rawmaterialsWOrWoDp.splice(Index);
        //     });
        // }
        console.log("finished duplicates");
        const rawmaterials = rawmaterialsWOrWoDp;
        console.log("finished rawmaterials");
        const RawMaterialsWtPerSubmit = event.detail.total; 
        console.log("finished RawMaterialsWtPerSubmit");
        console.log("RawMaterialsWtPerSubmit",RawMaterialsWtPerSubmit);
        this.IsOpenPopupSubmit = true;                //Set the popup for undo open when the button is clicked
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsOpenPopupSubmit = false;
        },4500);
        let RecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
        
        RecCreId = setTimeout(() => {
            rawmaterials.forEach(record=>{
                const fields = {
                    TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                    RawMaterials__c : record.RawMaterial,
                    RawMaterialWeight__c : record.RawMaterialWeight,
                };
                const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields}
                this.CreateRecorc(recordInput)
                .then(result=>{
                    console.log(result);
                })
                .catch(error=>{
                    console.error(error);
                });
            });
                console.log("RawMaterialsWtPerSubmit1",RawMaterialsWtPerSubmit);
                const fieldValue = this.WtTypeFieldValue + RawMaterialsWtPerSubmit;
                console.log("fieldValue:",fieldValue);
                this.WtTypeFieldValue = fieldValue;
                console.log("fieldValue update:",fieldValue);
                //Account Updation
                const Accfield = {
                    Id : this.recordId,
                    [`Pending_Wt_${this.type}__c`] : fieldValue,
                };
                this.HandleUpdate(Accfield)
                .then(result=>{
                    //this.UpdatedValues.push(Accfield);
                    console.log("UpdatedValues:",this.UpdatedValues);
                })
                .catch(error=>{
                    console.error(error);
                });
                //CurrentDate Record Updation
                const CurDtRecFld = {
                    Id : this.CurrentDateRecId,
                    [`DaySpecific${this.type}BalanceWt__c`] : fieldValue,
                }
                this.HandleUpdate(CurDtRecFld)
                .then(result=>{
                    //this.UpdatedValues.push(CurDtRecFld);
                    console.log("UpdatedValues:",this.UpdatedValues);
                })
                .catch(error=>{
                    console.error(error);
                });
        }, 5000);
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        
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
            });
    }



    //Handle Record Updation
    HandleUpdate(fields){
        const RecIp = {fields}
       return updateRecord(RecIp)
        .then(result=>{
            this.dispatchEvent(new ShowToastEvent({
                title: "Info",
                message: `Updation Successful`,
                variant: "info"
            }));
            return result;
        }).catch(error=>{
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
        })
    }


    //Handling Undo Popup for creation of record
    triggerCancelSubmitRecCreation(){
        this.IsOpenPopupSubmit = false;
        this.HandleCancelRecCreation(this.TimeoutSubmitRecCreId);
    }
    triggerCancelCurrentDateRecCreation(){
        this.IsOpenPopupCurrDate = false;
        this.disableCreate = false;
        this.disableAddRawMat = true;
        this.disableAddTowel = true;                                     // Here we divided the popup for undo  CurrentDate Record  and Submit Record Creation because When we undo the Current Date record creation the button should enable again
        this.HandleCancelRecCreation(this.TimeoutCurrentDateRecCreId);
    }
    HandleCancelRecCreation(TimeoutRecCreId){
        clearTimeout(TimeoutRecCreId);
        this.dispatchEvent(new ShowToastEvent({
            title: 'Info',
            message: `Record Creation has been canceled `,
            varient : 'warning'
        }));
    }

    //To Close the Add Towel Tab
    handleCancel(){
        this.isaddTowel = false;
    }

}