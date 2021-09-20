class CComponent {

	constructor(name){
		this.name = name;
		this._id_counter = 0;
		this.inputs = [];
		this.outputs = [];
	}

	update(){}

	createInputNode(name){
		let node = new CNode(name, CNode.INPUT, this.inputs.length, this);
		this.inputs.push(node);
		return node;
	}

	createOutputNode(name){
		let node = new CNode(name, CNode.OUTPUT, this.outputs.length, this);
		this.outputs.push(node);
		return node;
	}

	input(arr){
		for (let n of this.getAllNodes()){
			n.reset();
		}
		for (let i = 0; i < arr.length; i++){
			this.getNode(i).write(arr[i]);
		}
		this.update();
		return this.output();
	}

	output(){
		let output = []
		for (let i = this.inputs.length; i < this.inputs.length+this.outputs.length; i++){
			output.push(this.getNode(i).read());
		}
		return output;
	}

	getNode(id){
		if (id < this.inputs.length){
			return this.inputs[id];
		}
		id -= this.inputs.length;
		if (id < this.outputs.length){
			return this.outputs[id];
		}
		return null;
	}

	getNodes(){
		return this.inputs.concat(this.outputs);
	}

	getAllNodes(){
		return this.getNodes();
	}

	toJSON(){
		return {
			name: this.name,
			inputs: this.inputs.map((e)=>{return [e.id, e.name]}),
			outputs: this.outputs.map((e)=>{return [e.id, e.name]}),
		};
	}

	toString(){
		return '{'+this.name+
		', inputs: ['+this.inputs.map(e=>{return e.state})+
		']  outputs: ['+this.outputs.map(e=>{return e.state})+']}';
	}
}

class AND extends CComponent {
	constructor(){
		super('AND');
		this.createInputNode('A');
		this.createInputNode('B');
		this.createOutputNode('C');
	}
	update(){
		if (this.inputs[0].read()==1 && this.inputs[1].read()==1)
			this.outputs[0].write(1);
		else
			this.outputs[0].write(0);
	}
}

class NOT extends CComponent{
	constructor(){
		super('NOT');
		this.createInputNode('A');
		this.createOutputNode('B');
	}
	update(){
		if (this.inputs[0].read()==1)
			this.outputs[0].write(0);
		else
			this.outputs[0].write(1);
	}
}

class IO extends CComponent{
	constructor(){
		super('IO');
		this.createInputNode('A');
		this.createOutputNode('A');
	}
	update(){
		this.outputs[0].write(this.inputs[0].read());
	}
}

class CCircuit extends CComponent{

	static components = {};

	static fromJSON(comp_name_or_json){
		if (typeof comp_name_or_json === 'string'){
			if (comp_name_or_json === 'AND') return new AND();
			else if (comp_name_or_json === 'NOT') return new NOT();
			else if (comp_name_or_json === 'IO') return new	IO();
			return CCircuit.fromJSON(CCircuit.components[comp_name_or_json]);
		}
		let json = comp_name_or_json;
		let circuit = new CCircuit(json.name);
		for (let comp of json.components){
			let c = CCircuit.fromJSON(comp);
			if (c){
				circuit.components.push(c);
				for (let n of c.inputs){
					n._component = c;
				}
				for (let n of c.outputs){
					n._component = c;
				}
			}
			else{
				console.log('Component '+comp+' nao encontrado')
			}
		}
		for (let id of json.inputs){
			let n = circuit.components[id[0]].getNode(id[1]);
			n.name = id[2];
			circuit.inputs.push(n);
		}
		for (let id of json.outputs){
			let n = circuit.components[id[0]].getNode(id[1]);
			n.name = id[2];
			circuit.outputs.push(n);
		}
		for (let con of json.connections){
			let n1 = circuit.getNode(con[0]);
			let n2 = circuit.getNode(con[1]);
			if (!n1.connect(n2)){
				console.err("ERRO AO CONECTAR NODES");
			}
		}
		CCircuit.components[json.name] = json;
		return circuit;
	}

	constructor(name, components){
		super(name);
		this.inputs = [];
		this.outputs = [];
		this.components = components??[];
		this._inputs_i = [];
		this._outputs_i = [];
		//find outputs and inputs
		for (let ci=0; ci < this.components.length; ci++){
			let c = this.components[ci];
			for (let i = 0; i < c.inputs.length; i++){
				let n = c.inputs[i];
				n._component = c;
				if (n._inputs.length == 0){
					this.inputs.push([ci, i, n.name]);
				}
			}
			for (let i = 0; i < c.outputs.length; i++){
				let n = c.outputs[i];
				n._component = c;
				if (n.connections.length == 0){
					this.outputs.push([ci, i+c.inputs.length, n.name]);
				}
			}
		}
	}

	getNode(ni){
		if (ni instanceof Array){
			return this.components[ni[0]].getNode(ni[1]);
		}
		let n = super.getNode(ni);
		if (n){
			if (n instanceof CNode) return n;
			return this.getNode(n);
		}
		return n;
	}

	connections(){
		let connections = [];
		for (let ci = 0; ci < this.components.length; ci++){
			let c = this.components[ci];
			for (let ni = 0; ni < c.outputs.length; ni++){
				let n = c.outputs[ni];
				let n1code = [ci, c.inputs.length+ni];
				for (let con of n.connections){
					let n2code = [this.components.indexOf(con._component), con._component.inputs.indexOf(con)]
					connections.push([n1code, n2code]);
				}
			}
		}
		return connections;
	}

	update(){
		for (let c of this.components){
			c.update();
		}
	}

	getAllNodes(){
		if (this._all_nodes == undefined){
			this._all_nodes = [];
			for (let c of this.components){
				this._all_nodes = this._all_nodes.concat(c.getAllNodes());
			}
		}
		return this._all_nodes;
	}

	toJSON(){
		return {
			name: this.name,
			components: this.components.map((e)=>{return e.name}),
			connections: this.connections(),
			inputs: this.inputs.map(e=>{return [e[0], e[1], this.getNode(e)?.name]}),
			outputs: this.outputs.map(e=>{return [e[0], e[1], this.getNode(e)?.name]}),
		};
	}
}



function test(){
	A = new IO();
	B = new IO();
	N1 = new NOT();
	N2 = new NOT();
	AND1 = new AND();
	AND2 = new AND();
	C = new IO();
	A.getNode(0).name = 'A';
	B.getNode(0).name = 'B';
	C.getNode(1).name = 'OUT';

	A.outputs[0].connect(AND1.inputs[0]);
	A.outputs[0].connect(N2.inputs[0]);
	B.outputs[0].connect(AND2.inputs[1]);
	B.outputs[0].connect(N1.inputs[0]);
	N1.outputs[0].connect(AND1.inputs[1]);
	N2.outputs[0].connect(AND2.inputs[0]);
	AND1.outputs[0].connect(C.inputs[0]);
	AND2.outputs[0].connect(C.inputs[0]);
	XOR = new CCircuit('XOR', [A, B, N1, N2, AND1, AND2, C]);

	XOR.input([0,0]); XOR.update(); if(XOR.output()[0]!=0)throw"ERROR";
	XOR.input([1,0]); XOR.update(); if(XOR.output()[0]!=1)throw"ERROR";
	XOR.input([0,1]); XOR.update(); if(XOR.output()[0]!=1)throw"ERROR";
	XOR.input([1,1]); XOR.update(); if(XOR.output()[0]!=0)throw"ERROR";
	xor = CCircuit.fromJSON(XOR.toJSON());
	xor.input([0,0]); xor.update(); if(xor.output()[0]!=0)throw"ERROR";
	xor.input([1,0]); xor.update(); if(xor.output()[0]!=1)throw"ERROR";
	xor.input([0,1]); xor.update(); if(xor.output()[0]!=1)throw"ERROR";
	xor.input([1,1]); xor.update(); if(xor.output()[0]!=0)throw"ERROR";

	n3 = new NOT();
	n4 = new NOT(); 
	and3 = new AND();
	n3.outputs[0].connect(and3.inputs[0]);
	n4.outputs[0].connect(and3.inputs[1]);
	NOR = new CCircuit('NOR', [n3, n4, and3]);
	NOR.input([0,0]); NOR.update(); if(NOR.output()[0]!=1)throw"ERROR";
	NOR.input([1,0]); NOR.update(); if(NOR.output()[0]!=0)throw"ERROR";
	NOR.input([0,1]); NOR.update(); if(NOR.output()[0]!=0)throw"ERROR";
	NOR.input([1,1]); NOR.update(); if(NOR.output()[0]!=0)throw"ERROR";
	nor = CCircuit.fromJSON(NOR.toJSON());
	nor.input([0,0]); nor.update(); if(nor.output()[0]!=1)throw"ERROR";
	nor.input([1,0]); nor.update(); if(nor.output()[0]!=0)throw"ERROR";
	nor.input([0,1]); nor.update(); if(nor.output()[0]!=0)throw"ERROR";
	nor.input([1,1]); nor.update(); if(nor.output()[0]!=0)throw"ERROR";
	NOR2 = CCircuit.fromJSON(NOR.toJSON());
	n5 = new NOT();
	NOR2.outputs[0].connect(n5.inputs[0]);
	OR = new CCircuit('OR', [NOR2, n5]);
	OR.input([0,0]); OR.update(); if(OR.output()[0]!=0)throw"ERROR";
	OR.input([1,0]); OR.update(); if(OR.output()[0]!=1)throw"ERROR";
	OR.input([0,1]); OR.update(); if(OR.output()[0]!=1)throw"ERROR";
	OR.input([1,1]); OR.update(); if(OR.output()[0]!=1)throw"ERROR";
	or = CCircuit.fromJSON(OR.toJSON());
	or.input([0,0]); or.update(); if(or.output()[0]!=0)throw"ERROR";
	or.input([1,0]); or.update(); if(or.output()[0]!=1)throw"ERROR";
	or.input([0,1]); or.update(); if(or.output()[0]!=1)throw"ERROR";
	or.input([1,1]); or.update(); if(or.output()[0]!=1)throw"ERROR";

}
test();
