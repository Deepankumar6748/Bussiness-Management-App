import { LightningElement,api,track, wire } from 'lwc';
import NORMAL_FIELD from '@salesforce/schema/Account.Pending_Wt_Normal__c';
import BLACK_FIELD from '@salesforce/schema/Account.Pending_Wt_Black__c';
import PATANI_FIELD from '@salesforce/schema/Account.Pending_Wt_6666__c';
import EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRawMaterialInventory from '@salesforce/apex/getrecords.getRawMaterialInventory';
import getTowelsInventory from '@salesforce/apex/getrecords.getTowelsInventory';
import AddRawMatModal from 'c/addRawMaterial';
import AddTowModal from 'c/addTowel';

export default class WeaverWtDetails extends LightningElement {
    @api wtdetails = [];               //We get the records of Type "Normal or Black or 6666" for the current account to check for record creation
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
    @track RawMaterialsList;
    @track RawMatDetails;
    @api TowParticularsList;
    @api TowelDetails;
    @api TotalBalanceWage;
    @track DaySpecificWage ;
    @track ExtraAmtWage;            //This is the ammount that is to be given by the weaver
    @api SignificantWageBal;      //This is the bal amt that is not tallyed while paying wages that is splitted to each record


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
                    this.DaySpecificWage = record.DaySpecificWage__c;
                }
            });
        }
    }
    //To get the Current Account Details for Updating and using of the fields to maintain the weight balance and all related field values updation 
    @wire(getRecord, { recordId: "$recordId", fields: [NORMAL_FIELD,BLACK_FIELD,PATANI_FIELD,EXTRA_AMOUNT] })      //WtType
    wiredData({ error, data }) {
        if (data) {
            this.WtTypeFieldValue = data.fields[`Pending_Wt_${this.type}__c`].value;    //From the fetched record we access the value of the field and stored in the variable
            this.ExtraAmtWage = data.fields['ExtraAmtWage__c'].value;
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

    //For Creating Options for towel avilable and its details
    @wire (getTowelsInventory)                          //Get all the available Towels from Inventory
    Towrecords({data,error}){
        if(data){
            this.TowParticularsList = [];
            this.TowelDetails = [];
            //Here we have to make a picklist Options and an array with rawmaterial name and weights available
            data.forEach(record=>{
                this.TowParticularsList.push({
                    label : record.Name, value : record.Name
                });
                this.TowelDetails.push({
                    Towel : record.Name,
                    TowelQty : record.Quantity__c,
                    TowelWage : record.	TowelWage__c,
                    TowelId : record.Id
                });
            })
        }
    }
   
   
   //For Creating Options for Rawmaterials avilable and its details
   @wire (getRawMaterialInventory)                          //Get all the available RawMatreials from Inventory
   RawMatrecords({data,error}){
    if(data){
        this.RawMaterialsList = [];
        this.RawMatDetails = [];
        //Here we have to make a picklist Options and an array with rawmaterial name and weights available
        data.forEach(record=>{
            this.RawMaterialsList.push({
                label : record.Name, value : record.Name
            });
            this.RawMatDetails.push({
                RawMaterial : record.Name,
                AvailableRawMaterialWeight : record.Weight__c,
                RawMatId : record.Id,
                RawMatType : record.RawMatType__c
            });
        })
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
                    this.DaySpecificWage = 0;
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
            AddTowModal.open(
                {
                towparticularslist : this.TowParticularsList,
                onsubmit:(event)=>{
                    this.handleTowelsSubmit(event);
                }
            });
    }

    //To Open modal Window for the addition of RawMaterials Details
    handleClickAddRawMat(){
            AddRawMatModal.open(
                {
                rawmaterialslist : this.RawMaterialsList,
                rawmatdetails : this.RawMatDetails,
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
        this.IsOpenPopupSubmit = true;                //Set the popup open when the Submit button is clicked
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsOpenPopupSubmit = false;
        },4500);
        let RecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
        RecCreId = setTimeout(() => {
            this.disableAddTowel = true;            //To prevent queing of requests simultaneously
            towels.forEach(record=>{
                let TowWagePerUnit = this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelWage;
                let TowWage = parseFloat(TowWagePerUnit)  * parseFloat(record.Quantity);      // Accessing the wage based on the particular of the towel
                const fields = {
                    TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                    Particulars__c : record.Particulars,
                    Quantity__c : record.Quantity,
                    TowelWeight__c : record.TowelWeight,
                    TowelWagePerUnit__c : TowWagePerUnit,
                    Wage__c : TowWage
                };
                const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields}
                this.CreateRecorc(recordInput)
                .then(result=>{
                    console.log("fieldValue:",this.WtTypeFieldValue);
                    const fieldValue = parseFloat(this.WtTypeFieldValue) - parseFloat(record.TowelWeight);
                    this.WtTypeFieldValue = fieldValue;
                    console.log("fieldValue update:",fieldValue);
                    //CurrentDate Record Updation
                    console.log("DaySpecificWage Before update:",this.DaySpecificWage);
                    this.DaySpecificWage = parseFloat(TowWage) + parseFloat(this.DaySpecificWage);
                    console.log("DaySpecificWage After update:",this.DaySpecificWage);
                    const CurDtRecFld = {
                        Id : this.CurrentDateRecId,
                        [`DaySpecific${this.type}BalanceWt__c`] : fieldValue,
                        DaySpecificWage__c : this.DaySpecificWage
                    }
                    this.HandleUpdate(CurDtRecFld)
                    .then(result=>{
                        console.log("CurrentDate Record Updated");
                        //Account Updation
                        console.log("TotalBalanceWage Before Update",this.TotalBalanceWage);
                        console.log("ExtraAmtWage before update  while Towel :",this.ExtraAmtWage);
                        if(this.ExtraAmtWage !=0){
                            console.log("ExtraAmtWage  update  while Towel entered");
                            if(TowWage > this.ExtraAmtWage){
                                TowWage -= this.ExtraAmtWage;
                                console.log("TowWage update there is TowWage > ExtraAmtWage: TowWage",TowWage);
                                //We have to dispatch the event to add the extra amt in the significant balance
                                this.SignificantWageBal +=this.ExtraAmtWage;
                                const event = new CustomEvent('onupdsignbal',{detail: {significantwagebal : this.SignificantWageBal}});
                                this.dispatchEvent(event);
                                this.ExtraAmtWage = 0;
                                console.log("TowWage update there is TowWage > ExtraAmtWage: this.ExtraAmtWage",this.ExtraAmtWage);
                                this.UpdateExtAmtChg(this.ExtraAmtWage);
                            }
                            else if(this.ExtraAmtWage >= TowWage){
                                this.ExtraAmtWage -= TowWage;
                                console.log("ExtraAmtWage update there is ExtraAmtWage > TowWage: this.ExtraAmtWage",this.ExtraAmtWage);
                                TowWage = 0;
                                //Updating the current created towel record as paid because towwage is setteld with extra amt
                                const amtPaid = {
                                    Id: result.id,
                                    //we have to add the amount paid record id to this record to mark as paid
                                }
                                console.log("ExtraAmtWage update there is ExtraAmtWage > TowWage: TowWage",TowWage);
                                this.UpdateExtAmtChg(this.ExtraAmtWage);
                            }
                        }


                        this.TotalBalanceWage = parseFloat(this.TotalBalanceWage) + parseFloat(TowWage);
                        console.log("TotalBalanceWage After Update",this.TotalBalanceWage);
                        const Accfield = {
                            Id : this.recordId,
                            [`Pending_Wt_${this.type}__c`] : fieldValue,
                            SalaryBalance__c : this.TotalBalanceWage
                        };
                        this.HandleUpdate(Accfield)
                        .then(result=>{
                            console.log("Account Updated");
                            //Towel Inventory Updation
                            const Invfield = {
                                Id : this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelId,
                                Quantity__c : parseFloat(this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelQty) + parseFloat(record.Quantity)
                            };
                            this.HandleUpdate(Invfield)
                            .then(result =>{
                                console.log("Towel Inventory Updated");
                                //here we reflect the change in the cache
                                console.log("this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelQty += parseFloat(record.Quantity):",this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelQty += parseFloat(record.Quantity));
                                this.disableAddTowel = false;
                            })
                            .catch(error=>{
                                console.error("Towel Inventory Updation error:",error);
                            });
                        })
                        .catch(error=>{
                            console.error("Account Updation error:",error);
                        });
                    })
                    .catch(error=>{
                        console.error("CurrentDate Record Updation error:",error);
                    });
                })
                .catch(error=>{
                    console.error("Record Creation error:",error);
                });
            });   
        }, 5000);
        this.disableAddTowel = false;
        console.log("Exit");
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        
    }

    UpdateExtAmtChg(ExtAmtWage){
    //Acc updation after ExtraAmtWage changes
        const flds = {
            Id : this.recordId,
            ExtraAmtWage__c : ExtAmtWage
        }
        this.HandleUpdate(flds)
        .then(result => {
            console.log("Acc updated after ExtraAmtWage changes");
        })
        .catch(error =>{
            console.error("Acc updation after ExtraAmtWage changes error",error);
        });
    }




    //Handling Addition of RawMaterials Details for current Date
    handleRawMaterialsSubmit(event){
        const rawmaterialsWOrWoDp = event.detail.rawmaterials;
        console.log("entered ")
        //We have to process the list for duplicate values
        for (let i = 0;i < rawmaterialsWOrWoDp.length; i++) {
            let count = 0;
            let DuplicateInd = [];
            console.log("DuplicateInd",DuplicateInd);
            for (let j = 0 ; j < rawmaterialsWOrWoDp.length; j++) {
                if(rawmaterialsWOrWoDp[i].RawMaterial === rawmaterialsWOrWoDp[j].RawMaterial){
                    count++;
                    console.log("count",count);
                    if (count>1) {
                        rawmaterialsWOrWoDp[i].RawMaterialWeight = parseFloat(rawmaterialsWOrWoDp[i].RawMaterialWeight) + parseFloat(rawmaterialsWOrWoDp[j].RawMaterialWeight);
                        console.log("j",j);
                        DuplicateInd.push(j);
                    }
                }
                
            }
            if (count>1) {
                DuplicateInd.forEach(Index=>{
                    console.log("Index",Index);
                    rawmaterialsWOrWoDp.splice(Index);
                });
            }
        }
        console.log("finished duplicates");
        const rawmaterials = rawmaterialsWOrWoDp;
        console.log("finished rawmaterials");
        this.IsOpenPopupSubmit = true;                //Set the popup for undo open when the button is clicked
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsOpenPopupSubmit = false;
        },4500);
        let RecCreId;                // Intialize a variable to Store the id of the timeout function to be executed
        RecCreId = setTimeout(() => {
            this.disableAddRawMat = true;       //To prevent queing of requests simultaneously
                rawmaterials.forEach(record =>{
                    const fields = {
                        TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                        RawMaterials__c : record.RawMaterial,
                        RawMaterialWeight__c : record.RawMaterialWeight,
                    };
                    const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields}
                    this.CreateRecorc(recordInput)
                    .then(result=>{ 
                        console.log("fieldValue:",this.WtTypeFieldValue);     
                        const fieldValue = parseFloat(this.WtTypeFieldValue) + parseFloat(record.RawMaterialWeight);
                        this.WtTypeFieldValue = fieldValue;
                        console.log("fieldValue update:",fieldValue);
                        //Deduction updation
                        const rawmattype = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatType;
                        let Deduc = 0;
                        console.log("rawmattype",rawmattype);
                        if(rawmattype === 'Cone'){
                            Deduc = parseFloat(record.RawMaterialWeight) * 5 ;            //Here 5 represents per kg deduction amount of cone
                            console.log("Deduc",Deduc);
                            const field = {
                                Id : result.id,
                                DeductionAmtPerUnit__c : 5,
                                Deduction__c : Deduc 
                            }
                            this.HandleUpdate(field)
                            .then(result =>{
                                console.log("Deduction updated");
                            })
                            .catch(error =>{
                                console.error("Deduction error",error);
                            })
                        }
                        if(Deduc != 0 ){
                            console.log("Before Deduction this.TotalBalanceWage",this.TotalBalanceWage);
                            if((this.TotalBalanceWage - Deduc) < 0){
                                this.TotalBalanceWage = 0;
                                console.log("Before update ExtraAmtWage:",this.ExtraAmtWage);
                                this.ExtraAmtWage += (Deduc - this.TotalBalanceWage);
                                console.log("After update ExtraAmtWage:",this.ExtraAmtWage);
                                const accDedField = {
                                    Id : this.recordId,
                                    ExtraAmtWage__c : this.ExtraAmtWage
                                }
                                this.HandleUpdate(accDedField)
                                .then(result => {
                                    console.log("After update ExtraAmtWage:",this.ExtraAmtWage);
                                })
                                .catch(error =>{
                                    console.error("ExtraAmtWage Update Error:",error);
                                })
                            }
                            else{
                                this.TotalBalanceWage -= Deduc;
                                console.log("After Deduction this.TotalBalanceWage",this.TotalBalanceWage);
                            }
                        }
                        //CurrentDate Record Updation
                        const CurDtRecFld = {
                            Id : this.CurrentDateRecId,
                            [`DaySpecific${this.type}BalanceWt__c`] : fieldValue,
                        }
                        this.HandleUpdate(CurDtRecFld)
                        .then(result=>{
                            console.log("CurrentDate Record Updated");
                            //Account Updation
                            const Accfield = {
                                Id : this.recordId,
                                [`Pending_Wt_${this.type}__c`] : fieldValue,
                                SalaryBalance__c : this.TotalBalanceWage
                            };
                            this.HandleUpdate(Accfield)
                            .then(result=>{
                                console.log("Account Updated");
                                //Raw Material Inventory updation
                                const Invfield = {
                                    Id : record.RawMatId,
                                    Weight__c : parseFloat(record.SelectedRawMatWtAvailable) - parseFloat(record.RawMaterialWeight)
                                };
                                this.HandleUpdate(Invfield)
                                .then(result =>{
                                    console.log("Inventory Updated");
                                    //Available raw material weight updation
                                    //Here we update the RawMatdetails for reactivity to show in the frontend
                                    this.RawMatDetails.find(rec=> rec.RawMaterial === record.RawMaterial).AvailableRawMaterialWeight -= parseFloat(record.RawMaterialWeight);
                                    this.disableAddRawMat = false;
                                    //Dispatching an event at the end of this for each loop to notify the salary balance
                                    //if()

                                })
                                .catch(error =>{
                                    console.error("Inventory Updation error:",error);
                                });
                            })
                            .catch(error=>{
                                console.error("Account Updation error:",error);
                            });
                        })
                        .catch(error=>{
                            console.error("CurrentDate Record Updation error:",error);
                        });
                        console.log("Record creation result:",result);
                    })
                    .catch(error=>{
                        console.error(error);
                    });
                });
            },5000); 
            this.disableAddRawMat = false;
            console.log("Exit");
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
                throw error;
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