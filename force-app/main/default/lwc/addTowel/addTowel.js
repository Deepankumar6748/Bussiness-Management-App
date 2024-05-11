import { track,api } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class AddTowModal extends LightningModal {
    @api towparticularslist;
    @api balancewtavailable;
    @track towels = [{id: 1,Particulars:'',Quantity: 0,TowelWeight: 0}];
    @track id = 1;
    

   //We use this method to avoid empty rows in the addTowel Modal Tab
   get isOnlyoneRowAvailable(){
        return this.towels.length != 1;
   }

   addRow(){
        this.towels.push({id: this.id+1,Particulars:'',Quantity: 0,TowelWeight: 0});
        this.id += 1;
   }

   deleteTowel(event){
        const index = event.currentTarget.dataset.key;
        this.towels.splice(index,1);
        this.towels=[...this.towels];
   }

   handleChange(event){
        const {key,fields} = event.currentTarget.dataset;
        const value = event.target.value;
        this.towels[key][fields] = value;
        this.towels=[...this.towels];
   }

   handleSubmit() {
    if (this.isEmptyInputs()) {
        this.dispatchEvent(new ShowToastEvent({
            title: "Warning",
            message: "Fill all the fields",
            variant: "warning"
        }));
    } else {
            let total = 0;
            this.towels.forEach(value=>{
                total+= parseFloat(value.TowelWeight);
            });
            console.log(total);
        if (total <= this.balancewtavailable) {
            const event = new CustomEvent('submit', { detail: { towels: this.towels, total: total } });
            this.dispatchEvent(event);
            this.close();
        } else {
            this.dispatchEvent(new ShowToastEvent({
                title: "Warning",
                message: "Towel Weight is higher than the Rawwmaterial",
                variant: "warning"
            }));
        }
    }
}

isEmptyInputs() {
    return this.towels.some(towel => !towel.Particulars || !towel.Quantity || !towel.TowelWeight);  // It iterates all over the towels object and if any missing values then it returns true
}

}