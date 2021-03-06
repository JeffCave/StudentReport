'use strict';

/* global app d3 d1 moment db*/

let DisplayGrades_pending = false;
function DisplayGrades(config, renderer){
	config = config || {};
	if(config.force){
		DisplayGrades_pending = false;
	}
	if(DisplayGrades_pending){
		return;
	}
	DisplayGrades_pending = true;
	
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
	
	let RenderData = renderer || function(results){
		RenderStatusDot(results.finalRec);
		RenderGradeChart(results);
	};
	
	function queryData(dataHandler){
		let params = app.config;
		let effective = params.effective;
		
		let opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:3,
			startkey:[params.group,params.student],
			endkey:[params.group,params.student,{}],
		};
		
		db.query('metrics/gradesByDate', opts)
			.then( function(result){
				DisplayGrades_pending = false;
				if(result.rows.length === 0) return;
				
				let results = {
					projections: [],
					effective: effective,
					finalRec: null,
					firstRec: null,
					values: null,
				};
				
				
				results.values = result.rows.reduce(function(a,d){
					d = JSON.clone(d);
					if(a.length === 0){ 
						return [d];
					}
					
					let last = a[a.length-1];
					d.value.of += last.value.of;
					// either calculate the grade they have achieved
					if(effective > d.key[2]){
						d.value.grade += last.value.grade || 0;
						d.value.pct = d.value.grade / d.value.of;
					}
					// or calculate their projected grade
					else{
						d.value.pct = last.value.pct;
						d.value.grade = last.value.grade;
						let projection = null;
						if(!results.projections.length){
							projection = {
								'date'     : results.effective,
								'possible' : last.value.grade,
								'tangible' : last.value.grade,
								'probable' : last.value.grade,
								//'pct'      : last.value.grade / last.value.of,
								//'of'       : last.value.of,
								'pct'      : last.value.grade / d.value.of,
								'of'       : d.value.of,
							};
							results.projections.unshift(projection);
						}
						
						let lastProjection = results.projections[0];
						projection = {
							'date'     : d.key[2],
							'possible' : lastProjection.possible + (d.value.of - lastProjection.of),
							'tangible' : lastProjection.tangible,
							'probable' : lastProjection.pct * d.value.of,
							'pct'      : lastProjection.pct,
							'of'       : d.value.of,
						};
						results.projections.unshift(projection);
					}
					
					let enddate = app.parseDate(last.key[2]);
					let fill = [];
					for(let date = app.parseDate(d.key[2]); date > enddate; date.setDate(date.getDate()-1)){
						d.key[2] = app.formatDate(date);
						fill.push(JSON.clone(d));
					}
					
					while(fill.length > 0){
						a.push(fill.pop());
					}
					
					return a;
				},[]);
				
				// First Record
				results.firstRec = results.values[0];
				results.firstRec.value.date = results.firstRec.key[2];
				results.firstRec = results.firstRec.value;
				
				// Final Record
				results.finalRec = results.projections[0];
				if(!results.finalRec){
					results.finalRec = results.values[results.values.length-1];
					results.finalRec = {
							'date'     : results.finalRec.key[2],
							'possible' : results.finalRec.value.grade,
							'tangible' : results.finalRec.value.grade,
							'probable' : results.finalRec.value.grade,
							'pct'      : results.finalRec.value.pct,
							'of'       : results.finalRec.value.of,
						};
					results.projections.push(results.finalRec);
				}
				results.projections.reverse();
				
				// Call the Data Handler
				dataHandler(results);

			})
			.catch(function(err){
				console.log(err);
			});
	}
	
	/**
	 *
	 */
	function RenderStatusDot(finalGrades){
		let node = d1.querySelector("#studentgrades summary sub");
		node.innerHTML = [
				"<table>",
				" <tr><th>Possible</th><td>",(finalGrades.possible * 100.0).toFixed(1) + "%</td></tr>",
				" <tr><th>Probable</th><td>",(finalGrades.probable * 100.0).toFixed(1) + "%</td></tr>",
				" <tr><th>Tangible</th><td>",(finalGrades.tangible * 100.0).toFixed(1) + "%</td></tr>",
				"</table>"
			].join('');
		node.innerHTML = (finalGrades.probable * 100.0).toFixed(1) + "%";
		
		node = d1.querySelector("#studentgrades summary span.indicator");
		node.className = "indicator alert-" + thresholds
			// get the 
			.filter(function(d){
				return d.minrate <= finalGrades.probable;
			})
			.sort(function(a,b){
				return b.minrate - a.minrate;
			})
			[0].status.name
			;
	}
	
	/**
	 *
	 */
	function RenderGradeChart(data){
		// REVERSE THE STRING AND PRINT 
		//console.log(result);
		//console.log(projections);
		
		let svgParams = {};
		
		// Set the dimensions of the canvas / graph
		svgParams.margin = {top: 30, right: 50, bottom: 30, left: 20};
		svgParams.width = 600 - svgParams.margin.left - svgParams.margin.right;
		svgParams.height = 480 - svgParams.margin.top - svgParams.margin.bottom;
		
		// Set the ranges
		svgParams.x = d3.scaleTime().range([0, svgParams.width]);
		svgParams.y = d3.scaleLinear().range([svgParams.height, 0]);
		// Scale the range of the data
		svgParams.x.domain(d3.extent(data.values, function(d) { 
			return app.parseDate(d.key[2]); 
		}));
		svgParams.y.domain([0, 1]);
		
		
		// Define the axes
		let xAxis = d3.axisBottom().scale(svgParams.x).ticks(5);
		let yAxis = d3.axisRight().scale(svgParams.y).ticks(5);
		
		// Define the line
		let lineOf = d3.line()
			.curve(d3.curveStepBefore)
			.x(function(d) {
				let rtn = d.key[2];
				rtn = moment(rtn);
				rtn = svgParams.x(rtn.toDate());
				return rtn;
			})
			.y(function(d) { 
				return svgParams.y(d.value.of); 
			})
			;
		let lineGrade = d3.line()
			.curve(d3.curveStepBefore)
			.x(function(d) { 
				d = app.parseDate(d.key[2]); 
				return svgParams.x(d); 
			})
			.y(function(d) { return svgParams.y(d.value.grade); })
			;
		let linePossible = d3.line()
			//.curve(d3.curveCatmullRom)
			.x(function(d) {
				d = app.parseDate(d.date); 
				d = svgParams.x(d);
				return d; 
			})
			.y(function(d) {
				d = d.possible;
				d = svgParams.y(d);
				return d;
			})
			;
		let lineExpected = d3.line()
			//.curve(d3.curveCatmullRom)
			.x(function(d) {
				d = app.parseDate(d.date); 
				d = svgParams.x(d);
				return d; 
			})
			.y(function(d) {
				d = d.probable;
				d = svgParams.y(d);
				return d;
			})
			;
		
		// Adds the svg canvas
		let svg = d1.querySelector("#studentgrades svg");
		if(svg !== null){
			svg.parentNode.removeChild(svg);
		}
		svg = d3.select("#studentgrades")
			.append("svg")
				.attr("width", svgParams.width + svgParams.margin.left + svgParams.margin.right)
				.attr("height", svgParams.height + svgParams.margin.top + svgParams.margin.bottom)
			.append("g")
				.attr("transform","translate(" + svgParams.margin.left + "," + svgParams.margin.top + ")")
			;
		
		// Add the valueline path.
		svg.append("path")
			.attr("fill", "none")
			.attr("stroke", "black")
			.attr("d", lineOf(data.values))
			;
		svg.append("path")
			.attr("fill", "none")
			.attr("stroke", "green")
			.attr("d", lineGrade(data.values))
			;
		
		// Add the X Axis
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + svgParams.height + ")")
			.call(xAxis)
			;
		
		// Add the Y Axis
		svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate("+svgParams.width+",0)")
			.call(yAxis)
			;
		
		let gradeVals = data.projections.map((d)=>{
			let date = d.date;
			d = JSON.clone(data.projections[0]);
			d.date = date;
			return d;
		});
		//let randVals = data.projections.map((d,i)=>{
		//	d = JSON.clone(d);
		//	d.possible = (!i)?d.possible:Math.random();
		//	return d;
		//});
		let accordianVals = data.projections.map((d,i)=>{
			d = JSON.clone(d);
			d.date = data.projections[0].date;
			d.possible = i%2;
			return d;
		});
		svg.append("path")
			.attr("fill", "none")
			.attr("stroke", "steelblue")
			.attr("stroke-width", 3)
			.attr('opacity',0)
			.attr("d", linePossible(accordianVals))
			.transition()
				.delay(1200)
				.duration(1)
				.attr('opacity',1)
			.transition()
				.duration(1000)
				.ease(d3.easeElasticOut)
				.attr("d", linePossible(data.projections))
			;
		svg.append("path")
			.attr("fill", "none")
			.attr("stroke", "steelblue")
			.attr("stroke-width", 3)
			.attr('opacity',0)
			.attr("d", linePossible(data.projections))
			.transition()
				.delay(2300)
				.duration(1)
				.attr('opacity',1)
			.transition()
				.duration(1000)
				.ease(d3.easeElasticOut)
				.attr("d", lineExpected(data.projections))
			;
		svg.append("path")
			.attr("fill", "none")
			.attr("stroke", "steelblue")
			.attr("stroke-width", 3)
			.attr('opacity',0)
			.attr("d", linePossible(data.projections))
			.transition()
				.delay(2300)
				.duration(1)
				.attr('opacity',1)
			.transition()
				.duration(1000)
				.ease(d3.easeElasticOut)
				.attr("d", linePossible(gradeVals))
			;
		
		RenderGradeChartTodayLine(svg, data, svgParams);
	}
	
	function RenderGradeChartTodayLine(svg, data, svgParams){
		if(data.firstRec.date > data.effective) return;
		if(data.finalRec.date < data.effective) return;
		
		// Today Line
		let xToday = svgParams.x(app.parseDate(data.effective));
		let todayMarker = svg
			.selectAll('g#today')
			.data([data.effective])
			;
		let entry = todayMarker.enter()
			.append('g')
			.attr('id','today')
			//.attr("transform","translate(-100)");
			;
		todayMarker.attr("transform","translate(-100)");
		entry.append('text')
			.attr('font-size',10)
			.attr('opacity',0)
			.text(data.effective)
			;
		let textSize = Array.from(document.querySelectorAll('g#today > text'))[0].getBoundingClientRect();
		let rectSize = {
			x : xToday - (textSize.width/2) - 10,
			y : 0,
			height:textSize.height + 10,
			width:textSize.width + 20
		};
		
		entry.append('text')
			.attr('font-size',10)
			.attr('opacity',0)
			.attr('x',rectSize.x+10)
			.attr('y',14)
			.text(data.effective)
			.transition()
				.delay(1000)
				.duration(1000)
				.attr('opacity',1)
			;
		entry.append('rect')
			.attr('stroke','red')
			.attr('fill','rgba(255,0,0,0.25)')
			.attr('stroke-width',2)
			.attr('opacity',1)
			.attr('x',xToday)
			.attr('y', rectSize.height)
			.attr('width',0)
			.attr('height',0)
			.attr('rx',5)
			.attr('ry',5)
			.transition()
				.delay(400)
				.duration(500)
				.attr('x',rectSize.x)
				.attr('width',rectSize.width)
			.transition()
				.duration(500)
				.attr('y',0)
				.attr('height',rectSize.height)
			;
		entry.append('path')
			.attr("stroke", "red")
			.attr("stroke-width", 3)
			.attr("fill","red")
			.attr('opacity',0)
			.attr('d', [
				'M',0,',',svgParams.height,
				' Q ',xToday,',',svgParams.height,' ',xToday,',',svgParams.height,
				' Q ',xToday,',',svgParams.height,' ',svgParams.width,',',svgParams.height
				].join(''))
			.transition()
				.delay(100)
				.duration(1000)
				.attr('opacity', 1)
				.attr('d', [
					'M',xToday,',',svgParams.height,
					' Q ',xToday,',',svgParams.height,' ',xToday,',',rectSize.height,
					' Q ',xToday,',',svgParams.height,' ',xToday,',',svgParams.height
					].join(''))
			;
	}
	
	setTimeout(function(){queryData(RenderData);},1000);
	
}
