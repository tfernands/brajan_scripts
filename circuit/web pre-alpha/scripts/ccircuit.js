class CComponent {
	constructor(name){
		this.name = name;
		this.inputs = [];
		this.outputs = [];
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

	update(){}

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
		this.inputs = [
			new CNode('A', CNode.INPUT),
			new CNode('B', CNode.INPUT),
		];
		this.outputs = [
			new CNode('C', CNode.OUTPUT),
		];
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
		this.inputs = [
			new CNode('A', CNode.INPUT),
		];
		this.outputs = [
			new CNode('B', CNode.OUTPUT),
		];
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
		this.inputs = [
			new CNode('A', CNode.INPUT),
		];
		this.outputs = [
			new CNode('A', CNode.OUTPUT),
		];
	}
	update(){
		this.outputs[0].write(this.inputs[0].read());
	}
}

class CCircuit extends CComponent{

	static fromJSON(json, _nodes, components){

		if (json.name == 'IO'){
			let circuit = new IO();
			circuit.inputs[0].name = json.nodes[0].name;
			circuit.outputs[0].name = json.nodes[1].name;
			if (_nodes != undefined){
				_nodes[json.inputs[0]] = circuit.inputs[0];
				_nodes[json.outputs[0]] = circuit.outputs[0];
			}
			return circuit;
		}

		if (json.name == 'AND'){
			let circuit = new AND();
			circuit.inputs[0].name = json.nodes[0].name;
			circuit.inputs[1].name = json.nodes[1].name;
			circuit.outputs[0].name = json.nodes[2].name;
			if (_nodes != undefined){
				_nodes[json.inputs[0]] = circuit.inputs[0];
				_nodes[json.inputs[1]] = circuit.inputs[1];
				_nodes[json.outputs[0]] = circuit.outputs[0];
			}
			return circuit;
		}

		if (json.name == 'NOT'){
			let circuit = new NOT();
			circuit.inputs[0].name = json.nodes[0].name;
			circuit.outputs[0].name = json.nodes[1].name;
			if (_nodes != undefined){
				_nodes[json.inputs[0]] = circuit.inputs[0];
				_nodes[json.outputs[0]] = circuit.outputs[0];
			}
			return circuit;
		}

		let circuit = new CCircuit(json.name);
		let id_offset = CNode.ID_COUNTER;
		let nodes = _nodes??{};

		for (let cjson of json.components){
			let c = CCircuit.fromJSON(cjson, nodes);
			circuit.components.push(c);
		}
		for (let id of json.inputs){
			circuit.inputs.push(nodes[id]);
		}
		for (let id of json.outputs){
			circuit.outputs.push(nodes[id]);
		}
		for (let con of json.connections){
			if (!nodes[con[0]].connect(nodes[con[1]])){
				console.err("ERRO AO CONECTAR NODES");
			}
		}
		return circuit;
	}

	constructor(name, components){
		super(name);
		this.inputs = [];
		this.outputs = [];
		if (components == undefined) components = [];
		this.components = components;

		//find outputs and inputs
		let has_connection = {}
		for (let c of this.components){
			for (let n of c.getNodes()){
				if (n.type == CNode.OUTPUT){
					if (n.connections.length == 0){
						this.outputs.push(n);
					}
				}
				else if (n._inputs.length == 0){
					this.inputs.push(n);
				}
			}
		}
	}

	connections(){
		let connections = [];
		for (let c of this.components){
			for (let n of c.getNodes()){
				if (this.outputs.indexOf(n) == -1){
					for (let con of n.connections){
						connections.push([n.id, con.id]);
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
		return {
			name: this.name,
			nodes: this.getNodes().map((e)=>{return e.id}),
			components: this.components.map((e)=>{return e.toJSON()}),
			connections: this.connections(),
			inputs: this.inputs.map((e)=>{return e.id}),
			outputs: this.outputs.map((e)=>{return e.id}),
		};
	}
}