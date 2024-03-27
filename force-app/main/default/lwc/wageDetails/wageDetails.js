import { LightningElement,api } from 'lwc';

export default class WageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    connectedCallback(){
        console.log("this.wagedetails",this.wagedetails[0]);
        console.log("this.TotalBalanceWage",this.TotalBalanceWage);
    }
}