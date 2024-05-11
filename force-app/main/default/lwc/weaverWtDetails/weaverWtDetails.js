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
    @track iswtdetails;

    connectedCallback(){
        this.WtTypeField = `Pending_Wt_${this.type}__c`;    //By recognizing the weight type we assign the WtTypeField for accessing the values
        console.log("WtTypeField:",this.WtTypeField);
        console.log("wtdetails:",JSON.stringify(this.wtdetails));
        const currentDate = new Date();
        // Get year, month, and day
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Add 1 because month is zero-based
        const day = String(currentDate.getDate()).padStart(2, '0');
        // Format date as YYYY-MM-DD
         this.formattedDate = `${year}-${month}-${day}`;
        if (this.wtdetails.length > 0) {
            this.wtdetails.forEach(record =>{
                const recordDate = record.Date__c;
                if(recordDate === this.formattedDate){            // We check if there is record already  created for the current date
                    if (!record.WageCalculated__c) {            //Chech if wage calculated for current date if wage calculated we wont add towel or raw material on that day 
                        this.disableCreate = true;
                        this.disableAddRawMat = false;
                        this.disableAddTowel = false;
                        this.CurrentDateRecId = record.Id;
                        this.DaySpecificWage = record.DaySpecificWage__c;
                        this.DaySpecificDeduction = record.DaySpecificDeduction__c;
                    } else {
                        this.calcutionfinished();
                    }
                }
            });
            this.wtdetails = JSON.parse(JSON.stringify(this.wtdetails)); 
        }
        
    }

    renderedCallback(){
        if(this.wtdetails.length == 0){
            this.iswtdetails = false;
        }
        else{
            this.iswtdetails = true; 
        }
    }

    //To stop adding towel or rawmaterials after calculation on that day
    @api calcutionfinished(){
        this.disableCreate = true;
        this.disableAddRawMat = true;
        this.disableAddTowel = true;
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
                    this.dispatchEvent(new CustomEvent("updatelistparent", {detail :{record : newrec}}));
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
                balancewtavailable : this.WtTypeFieldValue,
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
                    let TowWage = (parseFloat(TowWagePerUnit)  * parseFloat(record.Quantity)).toFixed(2);      // Accessing the wage based on the particular of the towel
                    TotTowWage = (parseFloat(TotTowWage) + parseFloat(TowWage)).toFixed(2);
                    TotTowWeight = (parseFloat(record.TowelWeight) + parseFloat(TotTowWeight)).toFixed(2);
                    TowParticularIdAndQtyForInv.push({Id: Particulars,Quantity__c: parseFloat(this.TowelDetails.find(Element=> Element.Towel === record.Particulars).TowelQty) + parseFloat(record.Quantity)})  
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
        console.log("TowelRecords",JSON.stringify(TowelRecords));    
        RecCreId = setTimeout(  () => {
            this.disableAddTowel = true;            //To prevent queing of requests simultaneously
             CreateRecTowelOrRawMaterialWeightDetails({Records:TowelRecords})
                .then(response => {
                        if (response.isSuccess) {
                            //Assigning Ids for created record for ui cache updation
                            const createdRecIds = JSON.parse(JSON.stringify(response.createdIds));
                            console.log("createdRecIds",JSON.stringify(createdRecIds));
                            TowelRecords.forEach((element,index)=> {
                                element['Id'] = createdRecIds[index];
                            });
                            console.log("TowelRecords",JSON.stringify(TowelRecords));
                            const message = "All Towel Records are Created";
                            console.log(message);
                            this.SuccessToastmsg(message);

                            //CurrentDate Record Updation
                            console.log("fieldValue:",this.WtTypeFieldValue);
                            this.WtTypeFieldValue = (parseFloat(this.WtTypeFieldValue) - parseFloat(TotTowWeight)).toFixed(2);
                            console.log("fieldValue update:",this.WtTypeFieldValue);
                            console.log("DaySpecificWage Before update:",this.DaySpecificWage);
                            this.DaySpecificWage = (parseFloat(TotTowWage) + parseFloat(this.DaySpecificWage)).toFixed(2);
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
                                    this.InvUpdation(TowParticularIdAndQtyForInv)
                                    .then(result =>{
                                        if (result.Invupdrecs > 0) {
                                            if(result.Invupdrecs === TowParticularIdAndQtyForInv.length){
                                                const message = "All Towels are Updated in Inventory";
                                                this.SuccessToastmsg(message);
                                                this.disableAddTowel = false;
                                            }
                                            else{
                                                const message = "Only "+result.Invupdrecs+" records in Inventory is Updated out of "+TowParticularIdAndQtyForInv.length;
                                                this.WarningToastmsg(message);
                                                this.disableAddTowel = false;
                                            }
                                        } else {
                                            const message = "Towels Inventory Updation error";
                                            console.error(message);
                                            dispatchEvent(new ShowToastEvent({
                                                title: "Error",
                                                message: message,
                                                variant: "error"
                                            }));
                                            this.disableAddTowel = false;
                                        }

                                        //Cache Updation
                                            console.log("this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r Before",JSON.stringify(this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r));
                                            //console.log("JSON.stringify(this.wtdetails)",JSON.parse(JSON.stringify(this.wtdetails)));
                                            if (!this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r) {
                                                console.log("Entered no TowelOrRawMaterialWeightDetails__r")
                                                this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId)['TowelOrRawMaterialWeightDetails__r'] = [];
                                            }
                                            TowelRecords.forEach(element => {
                                                console.log("cnt");
                                                try {
                                                    this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r.push(element);    
                                                } catch (error) {
                                                        console.error("cache error",JSON.parse(error));
                                                        this.ErrorToastmsg(error);
                                                    }
                                            });
                                            this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId)[`DaySpecific${this.type}BalanceWt__c`] = this.WtTypeFieldValue;
                                            console.log("this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r After",JSON.stringify(this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r));
                                        try {
                                            this.dispatchEvent(new CustomEvent("updatelistchild", {detail :{records : TowelRecords, recid : this.CurrentDateRecId, dayspecificwage: this.DaySpecificWage}}));
                                            console.log("dispatched in submit Towels")
                                        } catch (error) {
                                            console.error("dispatched in submit Towels error ",error);
                                        }
                                    })
                                    .catch(error =>{
                                        console.error(error);
                                        this.ErrorToastmsg(error);
                                        this.disableAddTowel = false;
                                    })
                                })
                                .catch(error=>{
                                    console.error("Account Updation error:",error);
                                    this.ErrorToastmsg(error);
                                    this.disableAddTowel = false
                                });
                            })
                            .catch(error =>{
                                console.error("CurrentDate Record not Updated")
                                this.ErrorToastmsg(error);
                                this.disableAddTowel = false
                            })
                        } else {
                            const message = "All Towel Records not created"+response.message;
                            console.log(message);
                            this.WarningToastmsg(message);
                            this.disableAddTowel = false
                        }
                }) 
        }, 5000);
        //this.disableAddTowel = false;
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
        
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
        let RawMatRecords = [];         //For Towels Record Creation
        let RawMatParticularIdAndWtForInv = [];       // For Inventory Updation
        let TotRawMatDeduc = 0;             //For Acc And CurrentDate Record Updation
        let TotRawMatWeight = 0            //For Acc And CurrentDate Record Updation
        rawmaterials.forEach((record,index)=>{
                    const rawmat = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatId;           //Since RawMaterials__c is a lookup field so we store it as an id
                    const rawmattype = this.RawMatDetails.find(Rawmat => Rawmat.RawMaterial === record.RawMaterial).RawMatType;
                    console.log("rawmattype",rawmattype);
                    TotRawMatWeight = (parseFloat(TotRawMatWeight) + parseFloat(record.RawMaterialWeight)).toFixed(2);
                    RawMatParticularIdAndWtForInv.push({Id: rawmat,Weight__c:parseFloat(record.SelectedRawMatWtAvailable) - parseFloat(record.RawMaterialWeight)});
                    if (rawmattype === 'Cone') {
                        let Deduc = parseFloat(record.RawMaterialWeight) * 5 ;            //Here 5 represents per kg deduction amount of cone
                        console.log("Deduc",Deduc);
                        const fields = {
                            TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                            RawMaterials__c : rawmat,
                            RawMaterialWeight__c : parseFloat(record.RawMaterialWeight),
                            DeductionAmtPerUnit__c : 5,
                            Deduction__c : Deduc 
                        };
                        TotRawMatDeduc = (parseFloat(TotRawMatDeduc) + parseFloat(Deduc)).toFixed(2);
                        RawMatRecords.push(fields);
                    } else {
                        const fields = {
                            TowelOrRawMaterialWeightId__c : this.CurrentDateRecId,
                            RawMaterials__c : rawmat,
                            RawMaterialWeight__c : parseFloat(record.RawMaterialWeight),
                        };
                        RawMatRecords.push(fields);
                    }
            })
            RecCreId = setTimeout(() => {
                this.disableAddRawMat = true;
                CreateRecTowelOrRawMaterialWeightDetails({Records:RawMatRecords})
                .then(response => {
                        if (response.isSuccess) {
                            const message = "All RawMaterials Records are Created";
                            console.log(message);
                            this.SuccessToastmsg(message);

                            //CurrentDate Record Updation
                            console.log("fieldValue:",this.WtTypeFieldValue);     
                            this.WtTypeFieldValue= (parseFloat(this.WtTypeFieldValue) + parseFloat(TotRawMatWeight)).toFixed(2);
                            console.log("fieldValue update:",this.WtTypeFieldValue);
                            console.log("DaySpecificDeduction Before update:",this.DaySpecificDeduction);
                            this.DaySpecificDeduction = (parseFloat(TotRawMatDeduc) + parseFloat(this.DaySpecificDeduction)).toFixed(2);
                            console.log("DaySpecificDeduction After update:",this.DaySpecificDeduction);
                            const CurDtRecfields = {
                                Id : this.CurrentDateRecId,
                                [`DaySpecific${this.type}BalanceWt__c`] : this.WtTypeFieldValue,
                                DaySpecificDeduction__c : this.DaySpecificDeduction
                            }
                            HandleUpdate(CurDtRecfields)
                            .then(result =>{
                                const message = "CurrentDate Record Updated";
                                console.log(message);
                                //this.SuccessToastmsg(message);

                                //Account Record Updation
                                const Accfields = {
                                    Id : this.recordId,
                                    [`Pending_Wt_${this.type}__c`] : this.WtTypeFieldValue,
                                };
                                HandleUpdate(Accfields)
                                .then(result =>{
                                    const message = "Account Record Updated ";
                                    console.log(message);
                                    //this.SuccessToastmsg(message);

                                    //Towel Inventory Updation
                                    this.InvUpdation(RawMatParticularIdAndWtForInv)
                                    .then(result =>{
                                        //Check if atleast one record is updated
                                        if (result.Invupdrecs > 0) {
                                            //Check if all record is updated
                                            if(result.Invupdrecs === RawMatParticularIdAndWtForInv.length){
                                                RawMatParticularIdAndWtForInv.forEach(record => {
                                                    this.RawMatDetails.find(rec=> rec.RawMatId === record.Id).AvailableRawMaterialWeight = parseFloat(record.Weight__c);
                                                });
                                                const message = "All RawMaterials are Updated in Inventory";
                                                this.SuccessToastmsg(message);
                                                this.disableAddRawMat = false;
                                                
                                            }
                                            else{
                                                result.UpdInd.forEach(arr =>{
                                                    console.log("Cache Updated"+ arr);
                                                    this.RawMatDetails.find(rec=> rec.RawMatId === RawMatParticularIdAndWtForInv[arr].Id).AvailableRawMaterialWeight = parseFloat(RawMatParticularIdAndWtForInv[arr].Weight__c);
                                                })
                                                const message = "Only "+result.Invupdrecs+" records in Inventory is Updated out of "+RawMatParticularIdAndWtForInv.length;
                                                this.WarningToastmsg(message);
                                                console.error(message);
                                                this.disableAddRawMat = false;
                                            }
                                        } else {
                                            const message = "RawMaterials Inventory Updation error";
                                            console.error(message);
                                            dispatchEvent(new ShowToastEvent({
                                                title: "Error",
                                                message: message,
                                                variant: "error"
                                            }));
                                            this.disableAddRawMat = false;
                                        }

                                        //Cache Updation
                                        console.log("this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r Before",JSON.stringify(this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r));
                                        //console.log("JSON.stringify(this.wtdetails)",JSON.parse(JSON.stringify(this.wtdetails)));
                                        //If there is no child record then we have to initialize it
                                        if (!this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r) {
                                            console.log("Entered no TowelOrRawMaterialWeightDetails__r")
                                            this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId)['TowelOrRawMaterialWeightDetails__r'] = [];
                                        }
                                        RawMatRecords.forEach(element => {
                                            try {
                                                this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r.push(element);
                                                this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId)[`DaySpecific${this.type}BalanceWt__c`] = this.WtTypeFieldValue;
                                            } catch (error) {
                                                    console.error("cache error",JSON.parse(error));
                                                    this.ErrorToastmsg(error);
                                                }
                                        });
                                        console.log("this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r After",JSON.stringify(this.wtdetails.find(rec => rec.Id === this.CurrentDateRecId).TowelOrRawMaterialWeightDetails__r));
                                        
                                         try{
                                            this.dispatchEvent(new CustomEvent("updatelistchild", {detail :{records : RawMatRecords, recid : this.CurrentDateRecId, dayspecificdeduction: this.DaySpecificDeduction}}));
                                            console.log("dispatched in submit Towels")
                                        } catch (error) {
                                            console.error("dispatched in submit Towels error ",error);
                                        }                                            
                                    })
                                    .catch(error =>{
                                        console.error("Towel Inventory Updation error",error);
                                        this.ErrorToastmsg(error);
                                        this.disableAddRawMat = false
                                    })
                                })
                                .catch(error =>{
                                    console.error("Account Updation error:",error);
                                    this.ErrorToastmsg(error);
                                    this.disableAddRawMat = false
                                })
                            })
                            .catch(error=>{
                                console.error("CurrentDate Record not Updated")
                                this.ErrorToastmsg(error);
                                this.disableAddRawMat = false
                            })
                        }
                        else{
                            const message = "All RawMaterials Records are not created "+response.message;
                            console.log(message);
                            this.WarningToastmsg(message);
                            this.disableAddRawMat = false;              
                        }
                })
            },5000);
            this.disableAddRawMat = false;
            console.log("Exit");
        this.TimeoutSubmitRecCreId =  RecCreId; //Assigning the Timeoutid to cancel the particular Timeout
    }

    //To Update Towel And RawMaterial Inventory after towels are added
    async InvUpdation(RecordsForInvUpdation){
        //let Invupdrecs = 0;
        let index= -1;
        let Responseresult = {Invupdrecs:0,UpdInd:[]};
        for (const record of RecordsForInvUpdation){
            index++;
            await HandleUpdate(record)
            .then(result=>{
                Responseresult.UpdInd.push(index);      //for cache updation to update the available raw materials
                Responseresult.Invupdrecs++;
                console.log("Invupdrecs",Responseresult.Invupdrecs);
            })
            .catch(error=>{
                console.error(" HandleUpdate error",error);
            })
        }
        console.log("return", Responseresult.Invupdrecs);
        return Responseresult;
            
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
              try {
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
              } catch (error) {
                dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
              }
              
      }

}