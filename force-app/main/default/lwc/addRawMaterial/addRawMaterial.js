import { track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningModal from'lightning/modal';
import getRawMaterialInventory from '@salesforce/apex/getrecords.getRawMaterialInventory';
export default class AddRawMatModal extends LightningModal {
   @track rawmaterials = [{id: 1,RawMaterial:'',RawMaterialWeight: 0,SelectedRawMatWtAvailable: 0}];
   @track id = 1; 
   @track RawMaterialsList;     //Picklist Options for Raw Materials Available
   @track RawMatDetails;    //To store the weight details

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
                RawMaterialWeight : record.Weight__c
            });
        })
    }
   }                            

   //We use this method to avoid empty rows in the addTowel Modal Tab
   get isOnlyoneRowAvailable(){
        return this.rawmaterials.length != 1;
   }

   addRow(){
        this.rawmaterials.push({id: this.id+1,RawMaterial:'',RawMaterialWeight: 0,SelectedRawMatWtAvailable: 0});
        this.id += 1;
   }

   deleteRawMaterial(event){
        const index = event.currentTarget.dataset.key;
        this.rawmaterials.splice(index,1);
   }

   handleChangeRawMat(event){                   // we seperately handle this to otify the weights available
        const {key,fields} = event.currentTarget.dataset;
        const value = event.target.value;
        this.rawmaterials[key][fields] = value;
        this.findwt(value,key,fields);
   }

   findwt(value,key,fields){                    //go through this later
    this.RawMatDetails.forEach(record =>{
        if(record.RawMaterial === value){
            this.rawmaterials[key][SelectedRawMatWtAvailable] = record.RawMaterialWeight;
        }
    })
   }

   handleChange(event){
        const {key,fields} = event.currentTarget.dataset;
        const value = event.target.value;
        this.rawmaterials[key][fields] = value;
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
        this.rawmaterials.forEach(value=>{
            total+= parseFloat(value.RawMaterialWeight);
        });
        console.log(total);
        console.log("total");
        console.log("close");
        const event = new CustomEvent('submit', { detail: { rawmaterials: this.rawmaterials, total: total } });
        console.log("event initated");
        this.dispatchEvent(event);
        this.close();
        console.log("dispatched");
    }
}

isEmptyInputs() {
    return this.rawmaterials.some(rawmaterial => !rawmaterial.RawMaterial ||  !rawmaterial.RawMaterialWeight);  // It iterates all over the rawmaterials object and if any missing values then it returns true
}
}