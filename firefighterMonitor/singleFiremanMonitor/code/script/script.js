var heartbeatChartArray = [];
var temperatureChartArray = [];
var chartArray = [];
var webSocketArray = [];
var webSocket;
var alarmHistory = [];
var devices = [];
var tasks = [];
var streams = [];
var streamNames = [];
var sensors = [];
var actuators = [];
var indexTable = [];
var temperatureThreshold = 50;
var heartbeatThreshold = 120;
var heartbeatLowThreshold = 10;
var alarmHistory = [];

/*Function that opend a WebSocket for each device discovered.*/
function openConnection(){
	for(i = 0; i < sensors.length; i++){
		webSocketArray[i] = new WebSocket("ws://" + getAddress() + "/" + sensors[i].address); 
		indexTable.push({socket: webSocketArray[i], index: i});
		webSocketArray[i].onmessage = function(event){
			  var obj = JSON.parse(event.data);
			  str = JSON.stringify(obj);
			var index = extractIndex(this);
			verifyAlarm(obj, index);
			updateValues(obj, index);
		} 
		webSocketArray[i].onopen = function(){
			updateState("OK", "green");
		} 
		webSocketArray[i].onclose = function(){
			updateState("Closed", "black");
		} 
		webSocketArray[i].onerror = function(){
			updateState("Error", "red");
		}
	}
}

/*Function that matches a WebSocket and her index*/
function extractIndex(socket){
	var ret;
	for(i = 0; i < indexTable.length; i++){
		if(socket == indexTable[i].socket){
			ret = indexTable[i].index;
		}
	}
	return ret;
}

/*Function that verifies if an alarm was generated.*/
function verifyAlarm(obj, index){
	var type = sensors[index].name;
	var alarmEntry;
		
	if(type == "temperature"){
		appendAlarmInLog(type, obj);
		document.getElementById("sensor" + index).style.backgroundColor = "rgba(255, 0, 10, 0.3)";
		alarmEntry = {type:type, value:obj};
		alarmHistory.push(alarmEntry);
	} else if(type == "heartbeat"){
		if(obj >= heartbeatThreshold || obj <= heartbeatLowThreshold){
			appendAlarmInLog(type, obj);
			alarmEntry = {type:type, value:obj};
			alarmHistory.push(alarmEntry);
		}
		document.getElementById("sensor" + index).style.backgroundColor = "rgba(255, 0, 10, 0.3)";
	} else {
		document.getElementById("sensor" + index).style.backgroundColor = "white";
	}
}

/*Function that gets the target IP address.*/
function getAddress() {
	var ipAddress = document.getElementById("inputIPAddress").value;
	return ipAddress;
}

/*Function that sends a discover request to the a wearable device.*/
function discover(){
	var xhttp2 = new XMLHttpRequest();
	xhttp2.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var responseArray = JSON.parse(this.responseText);
			decodeDevices(responseArray);
		}
	};
	document.getElementById("placeholderDiv").remove();
	xhttp2.open("GET", "http://" + getAddress() + "/devices", true);
	xhttp2.send();
}

/*Function that decodes devices array.*/
function decodeDevices(receivedDevices){
	for(i = 0; i < receivedDevices.length; i++) {
		devices.push({id: receivedDevices[i].id, name: receivedDevices[i].name, description: receivedDevices[i].description, position: ""});
	}
	classifyDevices();
}

/*Function that classifies devices into sensors or actuators.*/
function classifyDevices(){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var responseArray = JSON.parse(this.responseText);
			for(i = 0; i < responseArray.length; i++){
				streamNames.push({id: responseArray[i].sensor.id, name: responseArray[i].name, position: responseArray[i].featureOfInterest.description });
			}
			for(i = 0; i < devices.length; i++){
				
					for(k = 0; k < streamNames.length; k++){
						if(devices[i].id == streamNames[k].id){
							sensors.push({id: devices[i].id, name: streamNames[k].name, description: devices[i].description, address: devices[i].id + "_" + streamNames[k].name, position: streamNames[k].position});
						}
					}
				
			}			
			discoverTasks();
		}
	};
	xhttp.open("GET", "http://" + getAddress() + "/dataStreams", true);
	xhttp.send();
}

/*Function that discovers tasks.*/
function discoverTasks(){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var responseArray = JSON.parse(this.responseText);
			for(i = 0; i < responseArray.length; i++){
				if(responseArray[i].supportedTasks.length != 0){
					actuators.push({id: responseArray[i].deviceId, task: responseArray[i].supportedTasks[0].title, position: responseArray[i].supportedTasks[0].description});
				}
			}	
			createComponents();
		}
	};
	xhttp.open("GET", "http://" + getAddress() + "/devices/tasks", true);
	xhttp.send();
}

/*Logging function for alarms.*/
function saveLog(){
	console.log(alarmHistory);
}

/*Function that create the graphic components according to the discoverd devices.*/
function createComponents(){
	
	for(i = 0; i < sensors.length; i++){
		var newDiv = document.createElement("div");
		newDiv.id = "sensor" + i;
		newDiv.className = "element";
		var positionDiv = document.createElement("div");
		var position = document.createTextNode(sensors[i].position.charAt(0).toUpperCase() + sensors[i].position.slice(1));   
		positionDiv.appendChild(position);
		
		if(sensors[i].name == "temperature"){
			var t = document.createTextNode("Temperature sensor");      
			newDiv.appendChild(t);	
			document.getElementById("left-col").appendChild(newDiv); 
			newDiv.appendChild(positionDiv);
			var sensorValueDiv = document.createElement("div");
			sensorValueDiv.className = "row";
			var valueLabelDiv = document.createElement("div");
			valueLabelDiv.className = "valueLabelDiv";
			var v = document.createTextNode("Value: ");
			valueLabelDiv.id = "valueLabelDiv" + i;
			valueLabelDiv.appendChild(v);
			var valueDiv = document.createElement("div");
			valueDiv.id = "valueDiv" + i;
			valueDiv.className = "valueDiv";
			sensorValueDiv.appendChild(valueLabelDiv);
			sensorValueDiv.appendChild(valueDiv);
			newDiv.appendChild(sensorValueDiv);
			var chartDiv = document.createElement("div");
			chartDiv.id="chartDiv" + i;
			var newCanvas = document.createElement("canvas");
			newCanvas.id="chart" + i;
			chartDiv.appendChild(newCanvas);
			newDiv.appendChild(chartDiv);
			generateTemperatureChart(i);
		} else {
			var t = document.createTextNode("Heartbeat sensor");                                          
			newDiv.appendChild(t);			
			document.getElementById("left-col").appendChild(newDiv); 
			newDiv.appendChild(positionDiv);
			var sensorValueDiv = document.createElement("div");
			sensorValueDiv.className = "row";
			var valueLabelDiv = document.createElement("div");
			valueLabelDiv.className = "valueLabelDiv";
			var v = document.createTextNode("Value: ");
			valueLabelDiv.appendChild(v);
			var valueDiv = document.createElement("div");
			valueDiv.id = "valueDiv" + i;
			sensorValueDiv.appendChild(valueLabelDiv);
			sensorValueDiv.appendChild(valueDiv);
			newDiv.appendChild(sensorValueDiv);
			var chartDiv = document.createElement("div");
			chartDiv.id="chartDiv" + i;
			var newCanvas = document.createElement("canvas");
			newCanvas.id="chart" + i;
			chartDiv.appendChild(newCanvas);
			newDiv.appendChild(chartDiv);
			generateHeartbeatChart(i);
		}
	}
	
	//actuators
	for(i = 0; i < actuators.length; i++){
		var newDiv = document.createElement("div");
		newDiv.id = "actuator" + i;
		newDiv.className = "row element actuator";
		
		var icon = document.createElement("IMG");
		icon.setAttribute("height", "50");
		icon.setAttribute("width", "50");
		icon.setAttribute("alt", "actuator icon");
		icon.setAttribute("data-index", i);
		var select = document.createElement("select");
		select.id = "select" + i;
		select.className = "styled-select blue semi-square";
		if(actuators[i].task == "speakWords"){
			var t = document.createTextNode("Earphone actuator");
			icon.setAttribute("src", "img/audio.svg");
			icon.addEventListener("click", function() {
				actuateSound(this);
			}); 
			var option = document.createElement("option");
			option.text = "Alarm!";
			select.add(option); 
			option = document.createElement("option");
			option.text = "Go back!";
			select.add(option); 
			option = document.createElement("option");
			option.text = "Back to truck!";
			select.add(option); 
		} else if (actuators[i].task == "vibratePad"){
			var t = document.createTextNode("Vibrating actuator");  
			icon.setAttribute("src", "img/vibration.svg");
			icon.addEventListener("click", function() {
				actuate(this);
			}); 
		} else if (actuators[i].task == "ringAlarm"){
			var t = document.createTextNode("Alarm actuator");  
			icon.setAttribute("src", "img/alarm.svg");
			icon.addEventListener("click", function() {
				actuate(this);
			}); 
		}
		
		icon.className = "col-3 actuatorIcon";
		newDiv.appendChild(icon);
		infoDiv = document.createElement("div");
		infoDiv.className = "col-5";

		var positionDiv = document.createElement("div");
		if(actuators[i].position == "helmet"){
			positionDiv.id = "Helmet";
			var p = document.createTextNode("Helmet");
		} else {
			positionDiv.id = "Body";
			var p = document.createTextNode("Body");
		}
		positionDiv.appendChild(p);
	
		infoDiv.appendChild(t);
		infoDiv.appendChild(positionDiv);
		
		newDiv.appendChild(infoDiv);
		if(actuators[i].type == "earphone"){ newDiv.appendChild(select); }
		
		if(actuators[i].task == "speakWords"){
			newDiv.appendChild(select);
		}
		document.getElementById("right-col").appendChild(newDiv); 
	}
}

/*Function that updates connection's state label.*/
function updateState(state, color) {
	document.getElementById("connectionLabel").textContent=state;
	document.getElementById("connectionLabel").style.color=color;
}

/*Function that updates printed values and labels.*/
function updateValues(value, i){
	var type = sensors[i].name;
	var measureUnit = (type == "temperature") ? "°":"bpm"; 
	updateChart(value, chartArray[i]);
	document.getElementById("valueDiv" + i).textContent = value + measureUnit;
}

/*Function that updates a chart.*/
function updateChart(value, chart){
	chart.data.datasets.forEach((dataset) => {
		if(dataset.data.length >= 20){
			dataset.data.splice(0, 1);
		}
		dataset.data.push(value);
		chart.data.labels.splice(0, 1);
		chart.data.labels.push("");
	});
	chart.update();
}

/*Function that sends a message to an actuator.*/
function actuate(e){
	var xhttp = new XMLHttpRequest();
	var index = e.dataset.index;
	var message = '{"duration":' + 2 + ', "sleep":' + 500 + '}';
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 202) {
			console.log("ack");
		}
	};
	var s = "http://" + getAddress() + "/devices/" + actuators[index].id +"/tasks/" + actuators[index].task;
	console.log(s);
	xhttp.open("PUT", s, true);
	xhttp.send(message);
}

/*Function that sends a message to a sound actuator.*/
function actuateSound(e){
	var xhttp = new XMLHttpRequest();
	var index = e.dataset.index;
	
	var stringToSend = document.getElementById("select" + index).value;
	var message = '{"words": ["' + stringToSend + '"]}'; 
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 202) {
			console.log("ack");
		}
	};
	var s = "http://" + getAddress() + "/devices/" + actuators[index].id +"/tasks/" + actuators[index].task;
	console.log(message);
	xhttp.open("PUT", s, true);
	xhttp.send(message);
}

/*Function that appends a new alarm in the log.*/
function appendAlarmInLog(type, value){
	var node = document.createElement("LI");                 // Create a <li> node
	var textnode = document.createTextNode(type + " alarm, registered value " + value);        
	node.appendChild(textnode);                              // Append the text to <li>
	document.getElementById("alarmLogList").prepend(node);     // Append <li> to <ul> with id="myList" 
}

/*Chart generation functions.*/
function generateTemperatureChart(index){
	var ctx = document.getElementById("chart" + index);
	chart = new Chart(ctx, {
		type: 'line',
		scaleOverride : true,
			scaleSteps : 10,
			scaleStepWidth : 50,
		data: {
			labels: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
			datasets: [{
				label: 'Temperature',
				data: [],
				backgroundColor: [
					'rgba(255, 0, 10, 0.3)',
				],
				borderColor: [
					'rgba(255,0,10,0.8)'
				],
				fill: true,
				lineTension: 0,
				borderWidth: 4
			}]
		},
		options: {
			responsive:true,
			maintainAspectRatio: false,
			hover: {
					mode: 'nearest',
					intersect: true
				},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero:true,
						max: 150
					}
				}]
			},
			elements: {
				point: {
					radius:0
				}
			}
		}
	});
	chartArray.push(chart);
}

function generateHeartbeatChart(index) {
	var ctx = document.getElementById("chart" + index);
	chart = new Chart(ctx, {
		type: 'line',
		scaleOverride : true,
			scaleSteps : 10,
			scaleStepWidth : 50,
		data: {
			labels: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
			datasets: [{
				label: 'Heartbeat rate',
				data: [],
				backgroundColor: [
					'rgba(0, 255, 100, 0.3)',
				],
				borderColor: [
					'rgba(0,255,100,0.8)'
				],
				fill: true,
				lineTension: 0,
				borderWidth: 4
			}]
		},
		options: {
			responsive:true,
			maintainAspectRatio: false,
			hover: {
					mode: 'nearest',
					intersect: true
				},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero:true,
						max: 200
					}
				}]
			},
			elements: {
				point: {
					radius:0
				}
			}
		}
	});	
	chartArray.push(chart);
}