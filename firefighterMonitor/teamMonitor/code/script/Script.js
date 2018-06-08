var heartbeatChartArray = [];
var temperatureChartArray = [];
var webSocketArray = [];
var alarmHistory = [];

/*Function that opens a WebSocket to the target IP address.*/
function openConnection(ipAddress, index){
	webSocketArray[index] = new WebSocket(ipAddress); 
	webSocketArray[index].onmessage = function(event){
		  var obj = JSON.parse(event.data);
		  str = JSON.stringify(obj);
		  updateValues(obj.timestamp, obj.type, obj.value, index);
		  console.log(obj);
		  verifyAlarm(obj, index);
	} 
	webSocketArray[index].onopen = function(){
		updateState("OK", "green", index);
	} 
	webSocketArray[index].onclose = function(){
		updateState("Closed", "black", index);
	} 
	webSocketArray[index].onerror = function(){
		updateState("Error", "red", index);
	}
}
  
/*Function that verifies if an alarm was detected.*/
function verifyAlarm(obj, index){
	if(obj.level != 0){
		var alarmEntry = {timestamp:obj.timestamp, type:obj.type, sender:index, level:obj.level};
		alarmHistory.push(alarmEntry);
	}
	updateIcon(obj.type, index, obj.level);
}

/*Function that gets the IP address to contact.*/
function getAddress(e) {
	var index = e.dataset.index;
	var ipAddress = document.getElementById("inputIPAddress" + index).value;
	openConnection(ipAddress, index);
}

/*Function that updates connection's state label.*/
function updateState(state, color, index) {
	document.getElementById("connectionLabel" + index).textContent=state;
	document.getElementById("connectionLabel" + index).style.color=color;
}

/*Function that updates values and labels during monitoring activity.*/
function updateValues(time, type, value, index){
	var date = time;
	var d = new Date(parseInt(date, 10));
	var dateTime = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
	document.getElementById("timeLabel" + index).textContent = dateTime;
	if(type == "temperature"){
		updateChart(value, temperatureChartArray[index]);
		document.getElementById("temperatureValueLabel" + index).textContent=value + "°";
	} else {
		updateChart(value, heartbeatChartArray[index]);
		document.getElementById("heartbeatValueLabel" + index).textContent=value + "bpm";
	}
}

/*Updating chart functions.*/
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

/*Logging function for alarm history.*/
function alarmLogs(){	
	console.log(alarmHistory);
}

/*Function that broadcasts an alarm to all team members.*/
function broadcastAlarm(e){
	var index = e.dataset.index;
	var length = webSocketArray.length;
	for(i = 0; i < length; i++){
		if(i != index){
			var alarm = '{"sender":' + index + ', "alarmType":' + "alarm" + ', "level":' + 1 + '}'; 
			console.log("Send " + alarm + " from " + index + " to " + i);
			webSocketArray[i].send(alarm);
		}
	}
}

/*Function that sends an alarm to the team leader.*/
function sendAlarmToLeader(e){
	var index = e.dataset.index;
	if(webSocketArray[0] != null){
		var alarm = '{"sender":' + index + ', "alarmType":' + "alarm" + ', "level":' + 1 + '}'; 
		webSocketArray[0].send(alarm);
		console.log("send alarm " + alarm + " from " + index + " to team leader");
	}
}

/*Function that update state icons according to the sensor's values.*/
function updateIcon(type, index, level){
	var target = "";
	if(type == "temperature"){
		target = "fireIcon" + index;
	} else {
		target = "heartbeatIcon" + index;
	}
	switch(level) {
    case 1:
        document.getElementById(target).style.filter = "unset";
		document.getElementById("main-element" + index).style.backgroundColor = "rgba(255, 0, 10, 0.3)";
        break;
    case 2:
        document.getElementById(target).style.filter = "invert(100%)";
		document.getElementById("main-element" + index).style.backgroundColor = "rgba(255, 0, 10, 0.3)";
        break;
    default:
        document.getElementById(target).style.filter = "grayscale(100%)";
		document.getElementById("main-element" + index).style.backgroundColor = "white";
	} 
}

/*Chart creation.*/
function generateTemperatureChart(index){
	var ctx = document.getElementById("temperatureChart" + index);
	temperatureChartArray[index] = new Chart(ctx, {
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
}

function generateHeartbeatChart(index) {
	var ctx = document.getElementById("heartbeatChart" + index);
	heartbeatChartArray[index] = new Chart(ctx, {
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
}