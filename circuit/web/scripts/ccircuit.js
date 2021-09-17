class CComponent {

	constructor(name){
		this.name = name;
		this._id_counter = 0;
		this.inputs = [];
		this.outputs = [];
	}

	update(){}

	createInputNode(name){
		let node = new CNode(name, CNode.INPUT, this);
		this.inputs.push(node);
		return node;
	}

	createOutputNode(name){
		let node = new CNode(name, CNode.OUTPUT, this);
		this.outputs.push(node);
		return node;
	}

	input(arr){
		for (let n of this.getAllNodes()){
			n.reset();
		}
		for (let i = 0; i < arr.length; i++){
			this.inputs[i].write(arr[i]);
		}
		this.update();
		return this.output();
	}

	output(){
		let output = []
		for (let i = 0; i < this.outputs.length; i++){
			output.push(this.outputs[i].read());
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
			nodes: this.inputs.concat(this.outputs).map((e)=>{return e.toJSON()}),
			inputs: this.inputs.map((e)=>{return e.id}),
			outputs: this.outputs.map((e)=>{return e.id}),
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

	static components = {
		'IO': (e)=>{return new IO()},
		'AND': (e)=>{return new AND()},
		'NOT': (e)=>{return new NOT()},
	};

	static fromJSON(comp_name_or_json){
		if (typeof comp_name_or_json === 'string'){
			return CCircuit.components[comp_name_or_json]?.();
		}
		let json = comp_name_or_json;
		let circuit = new CCircuit(json.name);
		for (let comp of json.components){
			let c = CCircuit.fromJSON(comp);
			if (c){
				circuit.components.push(c);
			}
			else{
				console.log('Component '+comp+' nao encontrado')
			}
		}
		for (let id of json.inputs){
			circuit.inputs.push(circuit.components[id[0]].getNode(id[1]));
		}
		for (let id of json.outputs){
			circuit.outputs.push(circuit.components[id[0]].getNode(id[1]));
		}
		for (let con of json.connections){
			let n1 = circuit.getNode(con[0]);
			let n2 = circuit.getNode(con[1]);
			if (!n1.connect(n2)){
				console.err("ERRO AO CONECTAR NODES");
			}
		}
		CCircuit.components[json.name] = ()=>{
			return CCircuit.fromJSON(json);
		}
		return circuit;
	}

	constructor(name, components){
		super(name);
		this.inputs = [];
		this.outputs = [];
		this.components = components??[];
		this._inputs_components = [];
		this._outputs_components = [];
		//find outputs and inputs
		for (let ci=0; ci < this.components.length; ci++){
			for (let n of this.components[ci].getNodes()){
				if (n.type == CNode.OUTPUT){
					if (n.connections.length == 0){
						this.outputs.push(n);
						this._outputs_components.push(ci);
					}
				}
				else if (n._inputs.length == 0){
					this.inputs.push(n);
					this._inputs_components.push(ci);
				}
			}
		}
	}

	getNode(ni){
		if (ni instanceof Array){
			return this.components[ni[0]].getNode(ni[1]);
		}
		return super.getNode(ni);
	}

	connections(){
		let connections = [];
		for (let c of this.components){
			let c_index = this.components.indexOf(c);
			for (let n of c.getNodes()){
				if (this.outputs.indexOf(n) == -1){
					for (let con of n.connections){
						connections.push([[c_index, n.id],
							[this.components.indexOf(con._component), con.id]]);
					}
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
		let name = this.name;
		let components = this.components.map((e)=>{return e.name});
		let connections = this.connections();
		let inputs = [];
		for (let i=0;i<this.inputs.length;i++){
			inputs.push([this._inputs_components[i], this.inputs[i].id])
		}
		let outputs = [];
		for (let i=0;i<this.outputs.length;i++){
			outputs.push([this._outputs_components[i], this.outputs[i].id])
		}

		return {
			name: name,
			components: components,
			connections: connections,
			inputs: inputs,
			outputs: outputs,
		};
	}
}

function assertEqual(a, b){
	if (a == b){
		return true;
	}
	else{
		throw "ERROR";
	}
	return false;
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

	XOR2 = CCircuit.fromJSON(XOR.toJSON());
	XOR2.input([0,0]); XOR2.update(); if(XOR2.output()[0]!=0)throw"ERROR";
	XOR2.input([1,0]); XOR2.update(); if(XOR2.output()[0]!=1)throw"ERROR";
	XOR2.input([0,1]); XOR2.update(); if(XOR2.output()[0]!=1)throw"ERROR";
	XOR2.input([1,1]); XOR2.update(); if(XOR2.output()[0]!=0)throw"ERROR";
}
test();
