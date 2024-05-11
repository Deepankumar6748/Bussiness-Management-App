import { LightningElement,api,track,wire } from 'lwc';
import getCalculateWages from '@salesforce/apex/getrecords.getCalculateWages';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import SALARY_BALANCE from '@salesforce/schema/Account.SalaryBalance__c';
import  EXTRA_AMOUNT from '@salesforce/schema/Account.ExtraAmtWage__c';
import  EXTRA_AMOUNT_ID from '@salesforce/schema/Account.ExtraAmtWageId__c';
import getRecordsTowOrRawMatWt from '@salesforce/apex/WeaverRecordDetails.getRecordsTowOrRawMatWt';
export default class WeaverDetails extends LightningElement  {
    @api recordId;
    //For  Weight Details part
    @track NormalWtDetails = [];
    @track BlackWtDetails = [];
    @track WtDetails6666 = [];
    @track TotalBalanceWage;
    @track ExtraAmtWage;
    @track ExtraAmtWageId;
    @track UnCalculatedWageDetails = [];
    @track CalculateWagesRecords = [];

    @wire(getRecordsTowOrRawMatWt,{recordId: '$recordId'})
    wiredTowOrRawMatWt({data}){
        if (data) {
            const{isSuccess, isNull, message, Records} = data;
            if(isSuccess){
                if(!isNull){
                    let records = JSON.parse(JSON.stringify(Records));
                    //console.log("records",JSON.stringify(records));
                    this.UnCalculatedWageDetails = records.filter(record => !record.WageCalculated__c && record.TowelOrRawMaterialWeightDetails__r);
                    this.NormalWtDetails = records.filter(record => record.TowelWeightType__c === 'Normal');
                    this.BlackWtDetails = records.filter(record => record.TowelWeightType__c === 'Black');
                    this.WtDetails6666 = records.filter(record => record.TowelWeightType__c === '6666');
                    console.log("No null records");
                }
                else{
                    console.log("Null records");
                }
            }
            else{
                
                console.log("response.Records",Records);
                console.log("getRecordsTowOrRawMatWt Error"+message);
            }


            
        }
         

    }   
    //For CalculatedSalary tab
    @wire(getCalculateWages,{recordId : "$recordId"})
    CalculateWagesRec({error, data}) {
        if (data) {
            // TODO: Error handling
            let records = JSON.parse(JSON.stringify(data));
            this.CalculateWagesRecords = records;
            console.log("GetCalculateWagesRec Success");
        } else if (error) {
            // TODO: Data 
            console.error("getCalculateWages error",error);
            this.ErrorToastmsg(error);
        }
    }
    //Reflect changes in calculated salary tab
    handleCalculationChanges(event){
        this.template.querySelector('c-weaver-wt-details').calcutionfinished();
        this.CalculateWagesRecords.unshift(event.detail.record);
        console.log("changes updated in  calculated salary");
    }

    handleUpdateListUncalcParent(event){
        this.UnCalculatedWageDetails = [...this.UnCalculatedWageDetails,event.detail.record]
        console.log("this.UnCalculatedWageDetails",this.UnCalculatedWageDetails);
    }

    handleUpdateListUncalcChild(event){
        console.log("handleUpdateListUncalcChild entered",JSON.stringify(event.detail));
        try {
            if(!this.UnCalculatedWageDetails.find(record => record.Id === event.detail.recid).TowelOrRawMaterialWeightDetails__r){
                console.log("Entered no TowelOrRawMaterialWeightDetails__r")
                this.UnCalculatedWageDetails.find(record => record.Id === event.detail.recid)['TowelOrRawMaterialWeightDetails__r'] = [];
            }
            event.detail.records.forEach(element => {
                this.UnCalculatedWageDetails.find(record => record.Id === event.detail.recid).TowelOrRawMaterialWeightDetails__r.push(element);
                console.log("this.UnCalculatedWageDetails updated")
            });
        } catch (error) {
            console.error("updatechild error",error)
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
        if(event.detail.dayspecificdeduction){
            this.UnCalculatedWageDetails.find(record => record.Id === event.detail.recid).DaySpecificDeduction__c = event.detail.dayspecificdeduction;
        }
        else if(event.detail.dayspecificwage){
            this.UnCalculatedWageDetails.find(record => record.Id === event.detail.recid).DaySpecificWage__c = event.detail.dayspecificwage;
        }
        
    }

    @wire(getRecord, { recordId: "$recordId", fields: [SALARY_BALANCE,EXTRA_AMOUNT,EXTRA_AMOUNT_ID] })      
    wiredData({ error, data }) {
        if (data) {
            this.TotalBalanceWage = data.fields['SalaryBalance__c'].value;
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
}
