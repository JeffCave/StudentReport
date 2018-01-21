'use strict';

/* 
global app
global db
global d1
global d3
global ProgBar
*/

let DisplayGradeAttend_pending = 0;
function DisplayGradeAttend(config){
	
	function queryAttendance(){
		let opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:5,
			startkey:[config.group],
			endkey:[config.group,{}],
		};
		db.query('metrics/attendance', opts)
			.then( function(result){
				DisplayGradeAttend_pending--;
				ProgBar.finish();
				if(result.rows.length ===0) return;
				
				let agg = result.rows
					.filter(function(d){
						return d.key.slice(2).join('-') <= config.effective;
					})
					.reduce(function(a,d){
						a[d.key[1]] = a[d.key[1]] || {sum:0,count:0};
						let b = a[d.key[1]];
						b.sum += d.value.sum;
						b.count += d.value.count;
						return a;
					},{});
				
				results.attendance = Object.entries(agg)
					.map(function(d){
						d[1] = d[1].sum / d[1].count;
						return d;
					})
					;
				aggregateData(results);
			});
		
	}
	
	function queryGrades(){
		let opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:3,
			startkey:[config.group],
			endkey:[config.group,{}],
		};
		db.query('metrics/gradesByDate', opts)
			.then( function(result){
				DisplayGradeAttend_pending--;
				ProgBar.finish();
				if (result.rows.length === 0) return;
				
				let agg = result.rows
					.filter(function(d){
						return d.key[2] <= config.effective;
					})
					.reduce(function(a,d){
						let b = (a[d.key[1]] || {
								'grade': 0,
								'of' : 0,
							});
						b.grade += d.value.grade;
						b.of += d.value.of;
						
						a[d.key[1]] = b;
						return a;
					},{});
				
				results.grades = Object.entries(agg)
					.map(function(d){
						d[1] = d[1].grade / d[1].of;
						return d;
					})
					;
				aggregateData(results);
			});	
	}
	
	function queryData(){
		config = JSON.merge(config, app.config);
		if(!config.group || !config.effective){
			ProgBar.finish(DisplayGradeAttend_pending);
			DisplayGradeAttend_pending = 0;
			return;
		};
		
		queryAttendance();
		queryGrades();
		
		
		let opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:3,
		};
		db.query('metrics/students', JSON.clone(opts))
			.then( function(result){
				DisplayGradeAttend_pending--;
				ProgBar.finish();
				if(result.rows.length === 0) return;
				
				results.students = result.rows;
				aggregateData(results);
			});
	}
	
	function aggregateData(data){
		if(!data.attendance) return false;
		if(!data.grades) return false;
		if(!data.students) return false;

		results.grades.forEach(function(d){
				let key = d[0];
				results.rates[key] = results.rates[key] || {
						attendance:0,
						grade:0,
						student:'',
					};
				results.rates[key].grade = d[1];
				results.rates[key].key = key;
			});
		results.attendance.forEach(function(d){
				let key = d[0];
				results.rates[key] = results.rates[key] || {
						attendance:0,
						grade:0,
						student:'',
					};
				results.rates[key].attendance = d[1];
				results.rates[key].key = key;
			});
		results.students.forEach(function(d){
				let key = d.key[0];
				results.rates[key] = results.rates[key] || {
						attendance:0,
						grade:0,
						student:'',
					};
				results.rates[key].student = d.key.slice(1).join(', ');
				results.rates[key].key = key;
			});
		
		results.current = JSON.clone(results.rates[config.student] || {});
		
		results.rates = Object.values(results.rates);
		config.callback(results);
	}
	
	function RenderChart(data){
		if(!data.rates) return;
		
		// set the dimensions and margins of the graph
		let margin = {top: 30, right: 30, bottom: 30, left: 30};
		let width = 480 - margin.left - margin.right;
		let height = 480 - margin.top - margin.bottom;
		
		// set the ranges
		let x = d3.scaleLinear().range([0, width]);
		let y = d3.scaleLinear().range([height, 0]);
		
		// append the svg obgect to the body of the page
		// appends a 'group' element to 'svg'
		// moves the 'group' element to the top left margin
		let svg = d1.querySelector("#studentdata svg");
		if(svg){
			svg.parentNode.removeChild(svg);
		}
		svg = d3.select("#studentdata")
			.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			.append("g")
				.attr("transform","translate(" + margin.left + "," + margin.top + ")")
			;
		
		// Scale the range of the data
		x.domain([0,1]);
		y.domain([0,1]);
		
		// Add the X Axis
		svg.append("g")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x))
			;
		
		// Add the Y Axis
		svg.append("g")
			.call(d3.axisLeft(y))
			;
		
		// https://bl.ocks.org/mbostock/3231298
		// Add the scatterplot
		let forceSim = d3.forceSimulation(data.rates)
			.force("x", d3.forceX(function(d) { return x(d.attendance); }).strength(1))
			.force("y", d3.forceY(function(d) { return y(d.grade); }).strength(1))
			.force("collide", d3.forceCollide(4.75))
			;
		for(let i=0; i< 200; i++){
			forceSim.tick();
		}
		// Sort the data so that the current person is at the bottom of the list
		// this forces it ot be drawn last and therefore be on the top
		data.rates = data.rates.sort((a,b)=>{
			if(data.current.key === a.key){
				return 1;
			}
			if(data.current.key === b.key){
				return -1;
			}
			return 0;
			
		});
		let dots = svg.selectAll("circle").data(data.rates);
		dots.enter()
				.append("circle")
			.merge(dots)
				.attr("cx", function(d) { 
					return d.x; 
				})
				.attr("cy", function(d) { 
					return d.y; 
				})
				.attr("class",function(d){
					let style = (data.current.key === d.key)?'current':'';
					return style;
				})
				.attr("r",function(d){
					let val = (data.current.key === d.key)?7:5;
					return val;
				})
				;
		dots.exit().remove();
	}
	
	
	/**
	 *
	 */
	function RenderTable(results){
		
		const thresholds = [
			{
				minrate:0.81,
				status:app.statuses.success,
			},
			{
				minrate:0.72,
				status:app.statuses.warn,
			},
			{
				minrate:0.57,
				status:app.statuses.danger,
			},
			{
				minrate:0,
				status:app.statuses.fail,
			}
		];
		
		const thresholdsAttendance = [
			{
				minrate:0.85,
				status:app.statuses.success,
			},
			{
				minrate:0.80,
				status:app.statuses.warn,
			},
			{
				minrate:0.5,
				status:app.statuses.danger,
			},
			{
				minrate:0,
				status:app.statuses.fail,
			}
		];
	

		let node = d1.querySelector("#studentsummary table");
		if(!node){
			d1.querySelector("#studentsummary").innerHTML = [
				"<summary><h1>All Students</h1></summary>",
				"<table>",
				" <thead>",
				"  <tr>",
				"   <th><abbr title='Grade'>G</abbr></th>",
				"   <th><abbr title='Attendance'>A</abbr></th>",
				"   <th><abbr title='Behaviour'>B</abbr></th>",
				"   <th>&nbsp;</th>",
				"   <th>&nbsp;</th>",
				"  </tr>",
				" </thead>",
				" <tbody>",
				" </tbody>",
				"</table>"
			].join('');
			node = d1.querySelector("#studentsummary table");
		}
		
		node.tBodies[0].innerHTML = '';
		Object.values(results.rates)
			.map(function(d){
				let grade = d.grade; 
				grade = thresholds
					// get the 
					.filter(function(d){
						return d.minrate <= grade;
					})
					.sort(function(a,b){
						return b.minrate - a.minrate;
					})
					[0].status.name
					;
				let attend = d.attendance;
				attend = thresholdsAttendance
					.filter(function(d){
						return d.minrate <= attend;
					})
					.sort(function(a,b){
						return b.minrate - a.minrate;
					})
					[0].status.name
					;
				let rtn = {
						gradeAlert: grade,
						attendAlert: attend,
						id: d.key,
						student: d.student,
						grade: d.grade,
						attend: d.attendance,
					};
				return rtn;
			})
			.sort(function(a,b){
				return a.student.localeCompare(b.student);
			})
			.map(function(d){
				let html = [
						" <td><span class='indicator alert-"+d.gradeAlert+"' > </span></td>",
						" <td><span class='indicator alert-"+d.attendAlert+"' > </span></td>",
						" <td><span class='indicator' > </span></td>",
						" <td>" + d.student + "</td>",
						" <td>" + d.id + "</td>",
					].join('');
					
				let tr = d1.createElement('tr');
				let id = d.id;
				tr.innerHTML = html;
				if(app.config.student === d.id){
					tr.classList.add('selected');
				}
				tr.addEventListener('click',function(e){
					if(tr.classList.contains)
					app.config.student=id; 
					let tbody = document.querySelectorAll('#studentsummary tr');
					tr.classList.add('selected');
					app.RedrawData({force:true});
				})
				return tr;
			})
			.forEach(function(d){
				node.tBodies[0].appendChild(d);
			})
			;
		node = d1.querySelector("#studentsummary summary h1");
		node.innerText = config.group;
		
	}
	
	
	config = JSON.merge(
			{'wait':0,force:false,callback:(result)=>{RenderChart(result);RenderTable(result);}}, 
			app.config, 
			config
		);
    if(config.force){
		ProgBar.finish(DisplayGradeAttend_pending);
		DisplayGradeAttend_pending = 0;
		config.wait = 0;
	}
	if(DisplayGradeAttend_pending){
		return;
	}
	DisplayGradeAttend_pending = 3;
	ProgBar.start(3);
	
	let results = {
		attendance:null,
		grades:null,
		rates:{}
	};
	let params = null;
	
	setTimeout(queryData,config.wait);
	
}
