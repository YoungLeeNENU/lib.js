/**
 * @fileOverview 事件处理模块
 * @name events.js
 * @author Young Lee youngleemails@gmail.com
 */
var winEvents = (function () {
	// Native functions
	var rawDefineProperty = Object.defineProperty;

	/**
	 * 变长参数列表
	 * @param { Function } func 原函数
	 * @returns { Function } 调用原函数的高阶函数
	 */
	function _restArgs(func) {
		return function () {
			arguments = arguments[0];
			func.apply(this, arguments);
		};
	}

	/**
	 * 通过 mixin 实现的继承
	 * @param { Object } receiver 接受者
	 * @param { Object } supplier 提供者
	 */
	function _mixin(receiver, supplier) {
		for (var prop in supplier) {
			receiver[prop] = supplier[prop];
		}
	}

	/**
	 * 停止当前对象对某一个事件的监听
	 * @param { Object } obj 当前对象
	 * @param { String } event 事件名称
	 */
	function _stopListeningEvent(obj, event) {
		if (obj.eventVariable && obj.eventVariable[event]) {
			obj.eventVariable[event] = void 0;
			delete obj.eventVariable[event];
		}
	}

	/**
	 * 停止当前对象对另外一个对象的所有事件的监听
	 * @param { Object } obj 当前对象
	 * @param { Object } other 另外一个对象
	 */
	function _stopListeningObject(obj, other) {
		if (other.eventPointer) {
			other.eventPointer = void 0;
			delete other.eventPointer;
		}
	}

	/**
	 * 停止当前对象监听另外一个对象的某个事件
	 * @param { Object } obj 当前对象
	 * @param { Object } other 另外一个对象
	 * @param { String } event 事件名称
	 */
	function _stopListening(obj, other, event) {
		if (other.eventPointer && other.eventPointer[event]) {
			var listeners = other.eventPointer[event]['listeners'] === void 0 ? [] : other.eventPointer[event]['listeners'];
			var idx = NaN;
			for (var i = 0; i < listeners.length; i++) {
				if (listeners[i]['obj'] === obj) {
					idx = i;
				}
			}
			other.eventPointer[event]['listeners'] = listeners.slice(0, idx).concat(listeners.slice(idx + 1, listeners.length));
			// other.eventPointer[event] = void 0;
			// delete other.eventPointer[event];
		}
		if (obj.eventVariable && obj.eventVariable[event]) {
			obj.eventVariable[event] = void 0;
			delete obj.eventVariable[event];
		}
	}
	
	/**
	 * Events 类
	 * @param { Function } model 实例
	 * @param { Function } view 实例
	 * @returns { Function } Scope-Safe 构造器
	 */
	function Events(model, view) {
		if (this instanceof Events) {
			this.model = model ? model : {};
			this.view = view ? view : {};
		} else { return new Events(model, view); }
	}

	/**
	 * 外部对象继承事件类
	 * @param { Object } external 外部对象
	 */
	Events.prototype.extends = function (external) {
		_mixin(external, this);
	};
	/**
	 * 事件绑定
	 * @param { String } event 事件名称
	 * @param { Function } callback 回调函数
	 * @param { Object } context 上下文
	 */
	Events.prototype.on = Events.prototype.bind = function (event, callback, context) {
		if (!this.eventSpace) {
			if (rawDefineProperty) {    // gt IE8
				rawDefineProperty(this, 'eventSpace', {
					value: {},
					enumerable: false,     // 保护一下 eventSpace
					configurable: true,
					writable: true
				});
			} else {    // lt IE8
				this.eventSpace = {};
			}
		}
		this.eventSpace[event] = {
			callback: callback,
			context: context,
			once: false
		};
	};
	/**
	 * 事件解除绑定
	 * @param { String } event 事件	 
	 * @param { Function } callback 回调函数
	 */
	Events.prototype.off = Events.prototype.unbind = function (event, callback) {
		switch(arguments.length) {
		case 0:    // 解除对象上所有的事件绑定
			if (this.eventSpace) {
				this.eventSpace = {};
			}
			break;
		case 1:
			if (typeof arguments[0] === "string") {    // unbind event
				if (this.eventSpace) {
					this.eventSpace[event] = void 0;
					delete this.eventSpace[event];
				}				
			} else {    // unbind callback
				if (this.eventSpace) {
					for (var prop in this.eventSpace) {
						if (this.eventSpace.hasOwnProperty(prop) && this.eventSpace[prop]['callback'] === arguments[0]) {
							this.eventSpace[prop] = void 0;
							delete this.eventSpace[prop];
						}
					}
				}
			}
			break;
		case 2:
			if (this.eventSpace) {
				this.eventSpace[event] = void 0;
				delete this.eventSpace[event];
			}
			break;
		default: break;
		};
	};
	/**
	 * 事件触发器
	 * @param { String } event 事件
	 * @param { Array } args 参数列表
	 */
	Events.prototype.trigger = function (event, args) {
		if (this.eventSpace && this.eventSpace[event]) {
			if (this.eventSpace[event] instanceof Object) {
				var cb = this.eventSpace[event]['callback'] instanceof Function ? this.eventSpace[event]['callback'] : new Function(),
					context = this.eventSpace[event]['context'] instanceof Object ? this.eventSpace[event]['context'] : this,
					once = typeof this.eventSpace[event]['once'] === "boolean" ? this.eventSpace[event]['once'] : false;
				_restArgs(cb).call(context, args);
				if (once) {
					this.eventSpace[event] = void 0;
					delete this.eventSpace[event];
				}
			}
		}
		if (this.eventPointer && this.eventPointer[event]) {
			var eventRecords = this.eventPointer[event]['listeners'] === void 0 ? [] : this.eventPointer[event]['listeners'];
			if (eventRecords instanceof Array && eventRecords.length) {
				var newListeners = [];
				for (var i = 0; i < eventRecords.length; i++) {
					var cb = eventRecords[i].obj.eventVariable[event]['callback'] instanceof Function ? eventRecords[i].obj.eventVariable[event]['callback'] : new Function(),
						context = eventRecords[i].obj.eventVariable[event]['context'] instanceof Object ? eventRecords[i].obj.eventVariable[event]['context'] : this,
						once = typeof eventRecords[i].once === "boolean" ? eventRecords[i].once : false;
					_restArgs(cb).call(context, args);    // 对于特定事件每个索引到的回调函数都执行一遍
					if (!once) {
						newListeners.push(eventRecords[i]);
					}
				}
				this.eventPointer[event]['listeners'] = void 0;
				this.eventPointer[event]['listeners'] = newListeners;
			}
		}
	};
	/**
	 * 事件绑定一次
	 * @param {} event
	 * @param {} callback
	 * @param {} context
	 */
	Events.prototype.once = function (event, callback, context) {
		if (!this.eventSpace) {
			if (rawDefineProperty) {    // gt IE8
				rawDefineProperty(this, 'eventSpace', {
					value: {},
					enumerable: false,     // 保护一下 eventSpace
					configurable: true,
					writable: true
				});
			} else {    // lt IE8
				this.eventSpace = {};
			}
		}
		this.eventSpace[event] = {
			callback: callback,
			context: context,
			once: true
		};	
	};
	/**
	 * 事件监听
	 * @param { Object } other 触发事件的对象
	 * @param { String } event 事件
	 * @param { Function } callback 回调函数
	 */
	Events.prototype.listenTo = function (other, event, callback) {
		// 在 other 中定义 eventPointer, 用于事件索引
		if (!other.eventPointer) {
			if (rawDefineProperty) {    // gt IE8
				rawDefineProperty(other, 'eventPointer', {
					value: {},
					enumerable: false,     // 保护一下 eventPointer
					configurable: true,
					writable: true
				});				
			} else {    // lt IE8
				other.eventPointer = {};
			}
		}
		var oldListeners = [];
		if (other.eventPointer[event] !== void 0) {
			oldListeners = other.eventPointer[event]['listeners'] === void 0 ? [] : other.eventPointer[event]['listeners'];
		}
		oldListeners.push({ obj: this, once: false });
		other.eventPointer[event] = {
			listeners: oldListeners
		};
		// 在 this 中定义 eventVariable, 用通过事件索引调用事件回调
		if (!this.eventVariable) {
			if (rawDefineProperty) {
				rawDefineProperty(this, 'eventVariable', {
					value: {},
					enumerable: false,
					configurable: true,
					writable: true
				});
			} else {
				this.eventVariable = {};
			}
		}
		this.eventVariable[event] = {
			callback: callback,
			context: this
		};
	};
	/**
	 * 事件解除监听
	 * @param {} other
	 * @param {} event
	 * @param {} callback
	 */
	Events.prototype.stopListening = function (other, event) {
		switch(arguments.length) {
		case 0:
			other.eventPointer = void 0;
			this.eventRecords = void 0;
			delete other.eventPointer;
			delete this.eventRecords;
			break;
		case 1:
			//TODO: 暂时不支持单参数的解除监听
			// if (typeof arguments[0] === "string") {    // event argument
			// 	_stopListeningEvent(this, arguments[0]);
			// } else {    // object argument
			// 	_stopListeningObject(this, arguments[1]);
			// }
			break;
		case 2:
			_stopListening(this, arguments[0], arguments[1]);
			break;
		default: break;
		};
	};
	/**
	 * 事件监听一次
	 * @param {} other
	 * @param {} event
	 * @param {} callback
	 */
	Events.prototype.listenToOnce = function (other, event, callback) {
		// 在 other 中定义 eventPointer, 用于事件索引
		if (!other.eventPointer) {
			if (rawDefineProperty) {    // gt IE8
				rawDefineProperty(other, 'eventPointer', {
					value: {},
					enumerable: false,     // 保护一下 eventPointer
					configurable: true,
					writable: true
				});				
			} else {    // lt IE8
				other.eventPointer = {};
			}
		}
		var oldListeners = [];
		if (other.eventPointer[event] !== void 0) {
			oldListeners = other.eventPointer[event]['listeners'] === void 0 ? [] : other.eventPointer[event]['listeners'];
		}
		oldListeners.push({ obj: this, once: true });
		other.eventPointer[event] = {
			listeners: oldListeners
		};
		// 在 this 中定义 eventVariable, 用通过事件索引调用事件回调
		if (!this.eventVariable) {
			if (rawDefineProperty) {
				rawDefineProperty(this, 'eventVariable', {
					value: {},
					enumerable: false,
					configurable: true,
					writable: true
				});
			} else {
				this.eventVariable = {};
			}
		}
		this.eventVariable[event] = {
			callback: callback,
			context: this
		};
	};
	
	return {
		events: Events
	};
})();
