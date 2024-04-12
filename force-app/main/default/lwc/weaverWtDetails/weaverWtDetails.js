import { LightningElement,api,track, wire } from 'lwc';
import NORMAL_FIELD from '@salesforce/schema/Account.Pending_Wt_Normal__c';
import BLACK_FIELD from '@salesforce/schema/Account.Pending_Wt_Black__c';
import PATANI_FIELD from '@salesforce/schema/Account.Pending_Wt_6666__c';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRawMaterialInventory from '@salesforce/apex/getrecords.getRawMaterialInventory';
import CreateRecTowelOrRawMaterialWeightDetails from '@salesforce/apex/CreateRecords.CreateRecTowelOrRawMaterialWeightDetails'
import getTowelsInventory from '@salesforce/apex/getrecords.getTowelsInventory';
import AddRawMatModal from 'c/addRawMaterial';
import {CreateRecorc,HandleUpdate} from 'c/recordCreationUpdationCancelUtility';
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
    @track RawMaterialsList;
    @track RawMatDetails;
    @track TowParticularsList;
    @track TowelDetails;
    @track DaySpecificWage ;
    @track DaySpecificDeduction;

    connectedCallback(){
        this.WtTypeField = `Pending_Wt_${this.type}__c`;    //By recognizing the weight type we assign the WtTypeField for accessing the values
        console.log("WtTypeField:",this.WtTypeField);
        console.log("wtdetails:",this.wtdetails);
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
                    this.DaySpecificDeduction = record.DaySpecificDeduction__c;
                }
            });
        }
    }
    //To get the Current Account Details for Updating and using of the fields to maintain the weight balance and all related field values updation 
    @wire(getRecord, { recordId: "$recordId", fields: [NORMAL_FIELD,BLACK_FIELD,PATANI_FIELD] })      //WtType
    wiredData({ error, data }) {
        if (data) {
            this.WtTypeFieldValue = data.fields[`Pending_Wt_${this.type}__c`].value;    //From the fetched record we access the value of the field and stored in the variable
        } else if (error) {
            console.error("WtTypeFieldValue Creation error",error);
            this.ErrorToastmsg(error);
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
        else if (error) {
            console.error("TowParticularsList Creation error",error);
            this.ErrorToastmsg(error);
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
    else if (error) {
        console.error("RawMaterialsList Creation error",error);
        this.ErrorToastmsg(error);
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
                CreateRecorc(recordInput)
                .then(result=>{
                    const message = "Date Record has been Created"
                    console.log(message);
                    this.SuccessToastmsg(message);
                    this.disableCreate = true;
                    this.disableAddRawMat = false;
                    this.disableAddTowel = false;
                    this.CurrentDateRecId = result.id;
                    this.DaySpecificWage = 0;
                    this.DaySpecificDeduction = 0;
                    const newrec = {
                        Id: result.id,
                        AccountId__c : this.recordId,
                        Date__c : this.formattedDate,
                        [`DaySpecific${this.type}BalanceWt__c`] : this.WtTypeFieldValue,
                        TowelOrRawMaterialWeightDetails__r:[],
                        DaySpecificDeduction__c : 0,
                        DaySpecificWage__c : 0,
                        TowelWeightType__c : this.type
                    };
                    this.wtdetails = [...this.wtdetails,newrec];
                })
                .catch(error =>{
                    this.disableCreate = false;         //If there is any error then the button is restored
                    console.error("Date Record Creation Error"+error);
                    this.ErrorToastmsg(error);
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
        let TowelRecords = [];         //For Towels Record Creation
        let TowParticularIdAndQtyForInv = [];       // For Inventory Updation
        let TotTowWage = 0;             //For Acc And CurrentDate Record Updation
        let TotTowWeight = 0            //For Acc And CurrentDate Record Updation
        towels.forEach((record)=>{
                    let TowWagePerUnit = this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelWage;
                    let Particulars = this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelId;
                    let TowWage = parseFloat(TowWagePerUnit)  * parseFloat(record.Quantity);      // Accessing the wage based on the particular of the towel
                    TotTowWage = parseFloat(TotTowWage) + parseFloat(TowWage);
                    TotTowWeight = parseFloat(record.TowelWeight) + parseFloat(TotTowWeight);
                    TowParticularIdAndQtyForInv.push({particular: Particulars,quantity: parseFloat(this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelQty) + parseFloat(record.Quantity)})  
                    const fields = {
                        TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                        Particulars__c : Particulars,
                        Quantity__c : parseFloat(record.Quantity),
                        TowelWeight__c : parseFloat(record.TowelWeight),
                        TowelWagePerUnit__c : TowWagePerUnit,
                        Wage__c : TowWage
                    };
                    TowelRecords.push(fields);
            })
        RecCreId = setTimeout(  () => {
            this.disableAddTowel = true;            //To prevent queing of requests simultaneously
             CreateRecTowelOrRawMaterialWeightDetails({TowelRecords:TowelRecords})
                .then(response => {
                        if (response.isSuccess) {
                            const message = "All Towel Records are Created";
                            console.log(message);
                            this.SuccessToastmsg(message);

                            //CurrentDate Record Updation
                            console.log("fieldValue:",this.WtTypeFieldValue);
                            this.WtTypeFieldValue = parseFloat(this.WtTypeFieldValue) - parseFloat(TotTowWeight);
                            console.log("fieldValue update:",this.WtTypeFieldValue);
                            console.log("DaySpecificWage Before update:",this.DaySpecificWage);
                            this.DaySpecificWage = parseFloat(TotTowWage) + parseFloat(this.DaySpecificWage);
                            console.log("DaySpecificWage After update:",this.DaySpecificWage);
                            const fields = {
                                Id : this.CurrentDateRecId,
                                [`DaySpecific${this.type}BalanceWt__c`] : this.WtTypeFieldValue,
                                DaySpecificWage__c : this.DaySpecificWage
                            }
                            HandleUpdate(fields)
                            .then(result =>{
                                const message = "CurrentDate Record Updated";
                                console.log(message);
                                //this.SuccessToastmsg(message);

                                //Account Record Updation
                                const fields = {
                                    Id : this.recordId,
                                    [`Pending_Wt_${this.type}__c`] : this.WtTypeFieldValue,
                                };
                                HandleUpdate(fields)
                                .then(result =>{
                                    const message = "Account Record Updated ";
                                    console.log(message);
                                    //this.SuccessToastmsg(message);

                                    //Towel Inventory Updation
                                    this.TowelInvUpdation(TowParticularIdAndQtyForInv)
                                    .then(result =>{
                                        if(result === TowParticularIdAndQtyForInv.length){
                                            const message = "All Towels are Updated in Inventory";
                                            this.SuccessToastmsg(message);
                                            this.disableAddTowel = false;
                                        }
                                        else{
                                            const message = "Only "+result+" records in Inventory is Updated out of "+TowParticularIdAndQtyForInv.length;
                                            this.WarningToastmsg(message);
                                            this.disableAddTowel = false;
                                        }
                                    })
                                    .catch(error =>{
                                        console.error(error);
                                        this.disableAddTowel = false
                                    })
                                })
                                .catch(error=>{
                                    console.error("Account Updation error:",error);
                                    this.disableAddTowel = false
                                });
                            })
                            .catch(error =>{
                                console.error("CurrentDate Record not Updated")
                                this.ErrorToastmsg(error);
                                this.disableAddTowel = false
                            })
                        } else {
                            const message = "All Towel Records not created";
                            console.log(message);
                            this.WarningToastmsg(message);
                            this.disableAddTowel = false
                        }
                }) 
        }, 5000);
        //this.disableAddTowel = false;
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        
    }

    //To Update Towel Inventory after towels are added
    async TowelInvUpdation(TowParticularIdAndQtyForInv){
        let Invupdrecs = 0;
        for (const record of TowParticularIdAndQtyForInv){
            const Invfield = {
                Id : record.particular,
                Quantity__c : record.quantity
            };
            await HandleUpdate(Invfield)
            .then(result=>{
                Invupdrecs++;
                console.log("Invupdrecs",Invupdrecs);
            })
            .catch(error=>{
                console.log(error);
            })
        }
        console.log("return", Invupdrecs);
        return Invupdrecs;
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
            let RawMatCreatedAndUpdated = {RawMatCreated: 0,CurrentDateUpd: 0,AccountUpd: 0,InventoryUpd:0}
                rawmaterials.forEach((record,index)=>{
                    const rawmat = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatId;           //Since RawMaterials__c is a lookup field so we store it as an id
                    const rawmattype = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatType;
                    let Deduc = 0;
                    console.log("rawmattype",rawmattype);
                    let fields
                    if (rawmattype === 'Cone') {
                        Deduc = parseFloat(record.RawMaterialWeight) * 5 ;            //Here 5 represents per kg deduction amount of cone
                        console.log("Deduc",Deduc);
                        fields = {
                            TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                            RawMaterials__c : rawmat,
                            RawMaterialWeight__c : record.RawMaterialWeight,
                            DeductionAmtPerUnit__c : 5,
                            Deduction__c : Deduc 
                        };
                    } else {
                        fields = {
                            TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                            RawMaterials__c : rawmat,
                            RawMaterialWeight__c : record.RawMaterialWeight,
                        };
                    }
                    const recordInput = { apiName: 'TowelOrRawMaterialWeightDetail__c' , fields}
                    CreateRecorc(recordInput)
                    .then(result=>{ 
                        console.log("RawMaterial Record Created for "+(index+1));
                        RawMatCreatedAndUpdated.RawMatCreated = parseFloat(RawMatCreatedAndUpdated.RawMatCreated) + 1;
                        console.log("fieldValue:",this.WtTypeFieldValue);     
                        const fieldValue = parseFloat(this.WtTypeFieldValue) + parseFloat(record.RawMaterialWeight);
                        this.WtTypeFieldValue = fieldValue;
                        console.log("fieldValue update:",fieldValue);
                        //Deduction updation
                        // const rawmattype = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatType;
                        // let Deduc = 0;
                        // console.log("rawmattype",rawmattype);
                        // if(rawmattype === 'Cone'){
                        //     Deduc = parseFloat(record.RawMaterialWeight) * 5 ;            //Here 5 represents per kg deduction amount of cone
                        //     console.log("Deduc",Deduc);
                        //     const field = {
                        //         Id : result.id,
                        //         DeductionAmtPerUnit__c : 5,
                        //         Deduction__c : Deduc 
                        //     }
                        //     HandleUpdate(field)
                        //     .then(result =>{
                        //         console.log("Deduction updated");
                        //     })
                        //     .catch(error =>{
                        //         console.error("Deduction error",error);
                        //     })
                        // }

                        //CurrentDate Record Updation
                        console.log("DaySpecificDeduction Before update:",this.DaySpecificDeduction);
                        this.DaySpecificDeduction = parseFloat(Deduc) + parseFloat(this.DaySpecificDeduction);
                        console.log("DaySpecificDeduction After update:",this.DaySpecificDeduction);
                        const CurDtRecFld = {
                            Id : this.CurrentDateRecId,
                            [`DaySpecific${this.type}BalanceWt__c`] : fieldValue,
                            DaySpecificDeduction__c : this.DaySpecificDeduction
                        }
                        HandleUpdate(CurDtRecFld)
                        .then(result=>{
                            console.log("CurrentDate Record Updated for "+(index+1));
                            RawMatCreatedAndUpdated.CurrentDateUpd = parseFloat(RawMatCreatedAndUpdated.CurrentDateUpd) + 1;

                            //Account Updation
                            const Accfield = {
                                Id : this.recordId,
                                [`Pending_Wt_${this.type}__c`] : fieldValue,
                            };
                            HandleUpdate(Accfield)
                            .then(result=>{
                                console.log("Account Updated for "+(index+1));
                                RawMatCreatedAndUpdated.AccountUpd = parseFloat(RawMatCreatedAndUpdated.AccountUpd) + 1;

                                //Raw Material Inventory updation
                                const Invfield = {
                                    Id : record.RawMatId,
                                    Weight__c : parseFloat(record.SelectedRawMatWtAvailable) - parseFloat(record.RawMaterialWeight)
                                };
                                HandleUpdate(Invfield)
                                .then(result =>{
                                    console.log("Inventory Updated for "+(index+1));
                                    RawMatCreatedAndUpdated.InventoryUpd = parseFloat(RawMatCreatedAndUpdated.InventoryUpd) + 1;
                                        //  this.val = {
                                        //     Id : RawSubid,
                                        //     TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                                        //     RawMaterials__c : rawmat,
                                        //     RawMaterialWeight__c : record.RawMaterialWeight,
                                        // } 
                                        //this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r = [...this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r,val];
                                        //console.log("fin");
                                    //Available raw material weight updation
                                    //Here we update the RawMatdetails for reactivity to show in the frontend
                                    //this.RawMatDetails.find(rec=> rec.RawMaterial === record.RawMaterial).AvailableRawMaterialWeight -= parseFloat(record.RawMaterialWeight);
                                    this.disableAddRawMat = false;
                                    //Dispatching an event at the end of this for each loop to notify the salary balance
                                    
                                    // if(index == rawmaterials.length -1){
                                    //     this.dispatchEvent(new CustomEvent('refresh'));
                                    // }
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
                    if(index === rawmaterials.length - 1){
                        if (RawMatCreatedAndUpdated.RawMatCreated === RawMatCreatedAndUpdated.CurrentDateUpd === RawMatCreatedAndUpdated.AccountUpd === RawMatCreatedAndUpdated.InventoryUpd === rawmaterials.length) {
                            const message = "All RawMaterials are Added and CurrentDate,Account,Invenory Records are Updated";
                            this.SuccessToastmsg(message);
                        } else {
                            const message = "Out of "+rawmaterials.length+" RawMaterials TowCreated "+RawMatCreatedAndUpdated.RawMatCreated+" CurrentDateUpd "+RawMatCreatedAndUpdated.CurrentDateUpd+" AccountUpd "+RawMatCreatedAndUpdated.AccountUpd+" InventoryUpd "+RawMatCreatedAndUpdated.InventoryUpd+" See Console for Detail ";
                            this.WarningToastmsg(message);
                        }
                    }
                });
            },5000);
            this.disableAddRawMat = false;
            console.log("Exit");
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
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
        const message = `Record Creation has been canceled `;
        this.WarningToastmsg(message);
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