import { LightningElement,api,track,wire } from 'lwc';
import AmountPayWage from 'c/amountPayWage';
import { createRecord , getRecord} from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CalculatWageModal from 'c/calculatWageModal';
import {CreateRecorc,HandleUpdate} from 'c/recordCreationUpdationCancelUtility';
import UpdateTowelOrRawMaterialWeight from '@salesforce/apex/UpdateRecords.UpdateTowelOrRawMaterialWeight';
export default class UncalculatedWageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    @api recordId;
    @track RecCreTimeoutId;
    @track isExtraAmtlimitReached;
    @track IsUndopopover = false;
    @api ExtraAmtWage;
    @api ExtraAmtWageId;
    @track isCalculatewage;

    handleClickExtAmtWagePay(){
        //It pays the wage without calculating the salary it is added to ExtAmtWage in acc record
        if (this.ExtraAmtWage < 5000) {            //here we settng limit to pay extamt
            let limit = 5000 - parseFloat(this.ExtraAmtWage);
            AmountPayWage.open({
                limitamount : limit,
                onsubmit:(event)=>{
                    this.handleAmountPay(event);
                }
            })
        }
        else{
            this.isExtraAmtlimitReached = true;
            const message = "Extra Amount Wage Limit Reached";
            this.WarningToastmsg(message);
        }

    }
    @track iswagedetails;
    renderedCallback(){
       if (this.wagedetails.length > 0) {
            this.iswagedetails = true;
       } else {
            this.iswagedetails = false;
       }

    //    if (this.ExtraAmtWage > 5000) {
    //         this.isExtraAmtlimitReached = true;
    //    }

    }

    async handleCalculateSalary(event){
        //console.log(JSON.stringify(this.wagedetails))
        //console.log(this.wagedetails.length);
        if(this.wagedetails.length !=0) {
            this.IsUndopopover = true;
            setTimeout(()=>{                        //Setting the timeout for Undo Popup
                this.IsUndopopover = false;
            },4500);
            this.RecCreTimeoutId = setTimeout(async () => {
            this.isCalculatewage = true;
            let TotalWageCalc = 0;
            let TotalDeducCalc = 0;
            let TotalSalaryCalc = 0;
            let Recfields = [];       //To Update the TowelOrRawMaterialWeight object with the id of the CalculateWage record created in the WageCalculated__c to mark it as calculated
            this.wagedetails.forEach(element => {
                TotalWageCalc = parseFloat(TotalWageCalc) + parseFloat(element.DaySpecificWage__c);
                TotalDeducCalc = parseFloat(TotalDeducCalc) + parseFloat(element.DaySpecificDeduction__c);
                Recfields.push({Id:element.Id,WageCalculated__c:''});
            });
            console.log("TotalWageCalc",TotalWageCalc);
            console.log("TotalDeducCalc",TotalDeducCalc);
            if (TotalWageCalc > TotalDeducCalc) {
                TotalSalaryCalc = parseFloat(TotalWageCalc) - parseFloat(TotalDeducCalc);
                console.log("TotalSalaryCalc",TotalSalaryCalc)
                let isCalculatewageRecCreated = false;
                let isTowelOrRawMaterialWeightUpdated = false;
                let isAccountUpdated = false;
                //CalculateWage Record Creation
                // Get year, month, and day
                const currentDate = new Date();
                const formattedTime = currentDate.toISOString();
                const CalculateWagefields = { 
                        AccountId__c: this.recordId,
                        CalculatedSalary__c: TotalSalaryCalc,
                        CalculationTime__c: formattedTime,
                        PaidSalary__c: 0
                    };
                //console.log("CalculateWagefields",JSON.stringify(CalculateWagefields));
                let CalculatRecId;
                const recordInput = {apiName: 'CalculateWage__c', fields:CalculateWagefields};
                //console.log("recordInput",JSON.stringify(recordInput));
                await createRecord(recordInput)
                .then(result =>{
                    isCalculatewageRecCreated = true;
                    CalculatRecId = result.id;
                    console.log("CalculatRecId",CalculatRecId);
                    const message = "CalculateWage Record Created";
                    console.log(message);
                    console.log("result.id",result.id);
                    this.SuccessToastmsg(message);
                })
                .catch(error =>{
                    console.error("CalculateWage Record Creation error:",error);
                    this.ErrorToastmsg(error);
                    this.isCalculatewage = false;
                })

                if (isCalculatewageRecCreated) {
                    //Daily Records Updation
                    Recfields.forEach(element => {
                        element.WageCalculated__c = CalculatRecId;
                    });
                    await UpdateTowelOrRawMaterialWeight({Records: Recfields})
                    .then(response =>{
                        if (response.isSuccess) {
                            isTowelOrRawMaterialWeightUpdated = true;
                            const message = "Calculation Updated in Daily Records";
                            console.log(message);
                            //this.SuccessToastmsg(message);
                        } else {
                            const message = "Calculation Updation Error in Daily Records "+response.message;
                            console.log(message);
                            this.WarningToastmsg(message);
                            this.isCalculatewage = false;
                        }
                    })
                }

                if (isTowelOrRawMaterialWeightUpdated) {
                    //Account Updation Salary
                    this.TotalBalanceWage = parseFloat(this.TotalBalanceWage) + parseFloat(TotalSalaryCalc);
                    const Accfields = {Id:this.recordId,SalaryBalance__c:this.TotalBalanceWage};
                    await HandleUpdate(Accfields)
                    .then(result =>{
                        isAccountUpdated = true;
                        const message = "Account Updated ";
                        console.log(message);
                        //this.SuccessToastmsg(message);
                    })
                    .catch(error =>{
                        const message = "Account Updation error ";
                        console.error(message+error);
                    })
                }

                if (isAccountUpdated) {
                    //Cache Updation
                    this.wagedetails = null;
                    this.isCalculatewage = true;
                    //To reflect the changes in calculated salary tab
                    this.dispatchEvent(new CustomEvent("calculationchanges", {detail:{record: {Id:CalculatRecId,PaidSalary__c: 0,BalanceSalary__c: TotalSalaryCalc}}}));
                    //Modal open
                    CalculatWageModal.open(
                        {
                            calculaterecid : CalculatRecId,
                        }
                    )
                }

            } else {
                const message = "Cannot Able to Calculate Wage Deduction greater than Wage"
                this.WarningToastmsg(message);
                this.isCalculatewage = false;
            }
            },5000);
        }
        else {
            this.isCalculatewage = true;
            const message = "No records for Calculation";
            console.log(message);
            this.WarningToastmsg(message);
        }
    }
    handleAmountPay(event){
        this.isExtraAmtlimitReached = true;
        this.IsUndopopover = true;
        setTimeout(()=>{                        //Setting the timeout for Undo Popup
            this.IsUndopopover = false;
        },4500);
        this.RecCreTimeoutId = setTimeout(() => {
            const currentDate = new Date();
            const formattedTime = currentDate.toISOString();
            const fields = {
                AccountId__c : this.recordId,
                Amount__c : event.detail.amount,
                AmountPaidTime__c : formattedTime,
                ModeOfPay__c : event.detail.modeofpay,
                Type__c : "Wage"
            }
            const recordInput = { apiName: 'Amount__c' , fields}
            createRecord(recordInput)
            .then(result=>{
                const msg = "Amount Paid Successfully : "+event.detail.amount;
                console.log(msg);
                this.SuccessToastmsg(msg);
                this.isExtraAmtlimitReached = false;
                    //Account Updation of Extra AmtWage
                    this.ExtraAmtWage = parseFloat(this.ExtraAmtWage) + parseFloat(event.detail.amount)
                    const Accfields = {
                        Id:this.recordId,
                        ExtraAmtWage__c : this.ExtraAmtWage,
                        ExtraAmtWageId__c: result.id
                    }
                    HandleUpdate(Accfields)
                    .then(result =>{
                        const msg = "Account Record Updated";
                        console.log(msg);
                        this.SuccessToastmsg(msg);
                    })
                    .catch(error =>{
                        console.log("Account updation Error",error);
                        this.ErrorToastmsg(error);
                    })
                
            })
            .catch(error =>{
                console.error("Amount Record Creation error:",error);
                this.ErrorToastmsg(error);
            })
        },5000);  
    }
    
  triggerCancelAmountRecCreation(){
    this.IsUndopopover = false;
    this.HandleCancelRecCreation(this.RecCreTimeoutId);
    this.isExtraAmtlimitReached = false;        //Enabling the button after process completion
  }
  HandleCancelRecCreation(TimeoutRecCreId){
    clearTimeout(TimeoutRecCreId);
    const message =  `Record Creation has been canceled `;
    this.WarningToastmsg(message);
    this.RecCreTimeoutId = null;
  }

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