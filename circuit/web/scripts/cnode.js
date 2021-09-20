
class CNode {

	static INPUT = 0;
	static OUTPUT = 1;

	constructor(name, type, id, component){
		this.name = name;
		this.type = type;
		this.id = id;
		this.connections = [];
		this.state = 0;
		this.events = {};
		this._inputs = [];
		this._component = component;
	}

	connect(node){
		if (node instanceof CNode){
			if (this.type == CNode.OUTPUT && node.type == CNode.INPUT){
				if (this.connections.indexOf(node) == -1 && node.connections.indexOf(this) == -1){
					this.connections.push(node);
					node._inputs.push(this);
					node.checkStateChange();
					this.connectEvent(this, node);
					return true;
				}
			}
			else if (this.type == CNode.INPUT && node.type == CNode.OUTPUT){
				let connected = node.connect(this);
				if (connected) this.connectEvent(node, this);
				return connected;
			}
		}	
		return false;
	}

	disconnect(node){
		if (this.type == CNode.OUTPUT && node.type == CNode.INPUT){
			let i = this.connections.indexOf(node);
			if (i!=-1){
				this.connections.splice(i,1);
				node._inputs.splice(node._inputs.indexOf(this),1);
				node.checkStateChange();
				this.disconectEvent(this, node);
				return true;
			}
		}
		else if (this.type == CNode.INPUT && node.type == CNode.OUTPUT){
			let disconnected = node.disconnect(this);
			if (disconnected) this.disconectEvent(node, this);
			return disconnected;
		}
		return false;
	}

	disconnectAll(){
		for (let n of this.connections){
			this.disconnect(n);
		}
		for (let n of this._inputs){
			this.disconnect(n);
		}
	}

	reset(){
		this.state = 0;
	}

	checkStateChange(){
		for (let n of this._inputs){
			if (n.state==1){
				this.write(1);
				return;
			}
		}
		this.write(0);
	}

	read(){
		return this.state;
	}

	write(state){
		if (state > 0) state = 1;
		else state = 0;
		if (this.state != state){
			this.state = state;
			for (let n of this.connections){
				n.checkStateChange();
			}
			this._dispatchEvent('stateChange');
		}
	}

	connectEvent(e){

	}

	disconectEvent(e){

	}

	addEventListener(event_name, callback){
		if (this.events[event_name] != undefined){
			this.events[event_name].push(callback);
		}
		else{
			this.events[event_name] = [callback];
		}
	}

	_dispatchEvent(event_name, args){
		if (this.events[event_name] != undefined){
			for (let ev of this.events[event_name]){
				ev(args);
			}
		}
	}

	toJSON(){
		return {
			name: this.name,
			type: this.type,
			id: this.id,
			state: this.state,
			connection: this.connections.map(e=>{return e.id}),
		};
	}

}
