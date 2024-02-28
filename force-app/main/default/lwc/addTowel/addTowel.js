import { LightningElement,track,api } from 'lwc';

export default class AddTowel extends LightningElement {
    ParticularsList = [
        {label : '6666',value :'6666'},
        {label :'35x70',value :'35x70'},
        {label :'51x102(white)',value :'51x102(white)'},
        {label :'30x60',value :'30x60'},
        {label :'51x102(Red)',value :'51x102(Red)'},
        {label :'51x102',value :'51x102'},
        {label :'45x90(Plain Red)',value :'45x90(Plain Red)'},
        {label :'45x90(Plain)',value :'45x90(Plain)'},
        {label :'45x90(Light color)',value :'45x90(Light color)'},
        {label :'45x90',value :'45x90'},
        {label :'50x100',value :'50x100'},
        {label :'70x140',value :'70x140'},
        {label :'70x140(Plain Red)',value :'70x140(Plain Red)'},
        {label :'70x140(Plain)',value :'70x140(Plain)'},
        {label :'75x150',value :'75x150'},
        {label :'25x50',value :'25x50'},
    ];

   @track towels = [{id: 1,Particulars:'',Quantity: 0,Weight: 0}];
   @api addtoweltab;
   @track id = 1;
   addRow(){
        this.towels.push({id: this.id+1,Particulars:'',Quantity: 0,Weight: 0});
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


    handleSubmit(){
        const event = new CustomEvent('close',{ detail: { TowelDetails: this.towels}}); //
        this.dispatchEvent(event);
    }
    handleCancel(){
        const event = new CustomEvent('cancel');
        this.dispatchEvent(event);
    }
}