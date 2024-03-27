import { track, wire,api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningModal from'lightning/modal';
export default class AddRawMatModal extends LightningModal {
   @track rawmaterials = [{id: 1,RawMaterial:'',RawMaterialWeight: 0,SelectedRawMatWtAvailable: 0,RawMatId: ''}];
   @track id = 1; 
   @api rawmaterialslist;     //Picklist Options for Raw Materials Available
   @api rawmatdetails;    //To store the weight details

                              

   //We use this method to avoid empty rows in the addTowel Modal Tab
   get isOnlyoneRowAvailable(){
        return this.rawmaterials.length != 1;
   }

   addRow(){
        this.rawmaterials.push({id: this.id+1,RawMaterial:'',RawMaterialWeight: 0,SelectedRawMatWtAvailable: 0,RawMatId: ''});
        this.id += 1;
   }

   deleteRawMaterial(event){
        const index = event.currentTarget.dataset.key;
        this.rawmaterials.splice(index,1);
   }

   handleChangeRawMat(event){                   // we seperately handle this to notify the weights available
        const {key,field1,field2,field3} = event.currentTarget.dataset;
        const value = event.target.value;
        this.rawmaterials[key][field1] = value;
        this.rawmaterials[key][field2] = this.findRawMatWt(value);
        this.rawmaterials[key][field3] = this.findRawMatId(value);
        console.log("this.rawmaterials[key][field1],this.rawmaterials[key][field2],this.rawmaterials[key][field3]",this.rawmaterials[key][field1],this.rawmaterials[key][field2],this.rawmaterials[key][field3]);
   }

   findRawMatWt(value){                    //using this function we find the weight limit for the selected raw material    
    const record = this.rawmatdetails.find(record=> record.RawMaterial === value);
        if(record){
            console.log("record.RawMaterial, record.AvailableRawMaterialWeight", record.RawMaterial, record.RawMaterialWeight);
            return record.AvailableRawMaterialWeight;
        }        
   }

   findRawMatId(value){                    //using this function we find the Id for the selected raw material record in inventory
    const record = this.rawmatdetails.find(record=> record.RawMaterial === value);
        if(record){
            console.log("record.RawMaterial, record.AvailableRawMaterialWeight,record.id", record.RawMaterial, record.RawMaterialWeight,record.RawMatId);
            return record.RawMatId;
        }        
   }

   handleChange(event){
        const {key,fields} = event.currentTarget.dataset;
        const value = event.target.value;
        this.rawmaterials[key][fields] = value;
        console.log("key,fields",key,fields);
   }

   handleSubmit() {
    if (this.isEmptyInputs()) {
        this.dispatchEvent(new ShowToastEvent({
            title: "Warning",
            message: "Fill all the fields",
            variant: "warning"
        }));
    }
    else if(this.isWtLimitExceeded()){
        this.dispatchEvent(new ShowToastEvent({
            title: "Warning",
            message: "Entered Weight is higher than available",
            variant: "warning"
        }));
    }
     else {
        let total = 0;
        this.rawmaterials.forEach(value=>{
            total+= parseFloat(value.RawMaterialWeight);
        });
        console.log(total);
        console.log("total");
        console.log("close");
        const event = new CustomEvent('submit', { detail: { rawmaterials: this.rawmaterials} });
        console.log("event initated");
        this.dispatchEvent(event);
        this.close();
        console.log("dispatched");
    }
}

isEmptyInputs() {
    return this.rawmaterials.some(rawmaterial => !rawmaterial.RawMaterial ||  !rawmaterial.RawMaterialWeight);  // It iterates all over the rawmaterials object and if any missing values then it returns true
}

isWtLimitExceeded(){
   return this.rawmaterials.some(rawmaterial => rawmaterial.RawMaterialWeight > rawmaterial.SelectedRawMatWtAvailable); 
}
}