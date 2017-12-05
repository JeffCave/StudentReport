'use strict';
let DisplayGrades_pending = false;
function DisplayGrades(config){
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
	
	setTimeout(function(){
		let params = app.config;
		let effective = params.effective;
		
		let opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:3,
			startkey:['logprog',params.student],
			endkey:['logprog',params.student,{}],
		};
		
		db.query('metrics/gradesByDate', opts)
			.then( function(result){
				DisplayGrades_pending = false;
				let projections = [];
				
				
				result.rows = result.rows.reduce(function(a,d){
					d = JSON.clone(d);
					if(a.length === 0){ 
						return [d];
					}
					
					let last = a[a.length-1];
					d.value.of += last.value.of;
					// either calulcate the grade they have acheived
					if(effective > d.key[2]){
						d.value.grade += last.value.grade || 0;
						d.value.pct = d.value.grade / d.value.of;
					}
					// or calcluate their projected grade
					else{
						d.value.pct = last.value.pct;
						d.value.grade = last.value.grade;
						if(!projections.length){
							projections.unshift({
								date: constants.today,
								possible: last.value.grade,
								avg: last.value.grade,
								pct: d.value.pct,
							});
						}
						projections.unshift({
							date: d.key[2],
							possible: projections[0].possible + (d.value.of - last.value.of),
							avg: projections[0].pct * d.value.of,
							pct: projections[0].pct,
						});
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
				
				// Set the status dot color
				let final = projections[0];
				if(!final){
				    final = result.rows[result.rows.length-1];
				    final = {
							date: final.key[2],
							possible: final.value.grade,
							avg: final.value.grade,
							pct: final.value.grade,
						};
					projections.push(final);
				}
                let node = d1.querySelector("#studentgrades summary sub");
                node.innerHTML = [
                        "<table>",
                        " <tr><th>Possible</th><td>",(final.possible * 100.0).toFixed(1) + "%</td></tr>",
                        " <tr><th>Probable</th><td>",(final.avg * 100.0).toFixed(1) + "%</td></tr>",
                        " <tr><th>Tangible</th><td>",(final.pct * 100.0).toFixed(1) + "%</td></tr>",
                        "</table>"
                    ].join('');
                node.innerHTML = (final.avg * 100.0).toFixed(1) + "%";
                
                node = d1.querySelector("#studentgrades summary span.indicator");
                node.className = "indicator alert-" + thresholds
                    .filter(function(d){
                        return d.minrate <= final.avg;
                    })
                    .sort(function(a,b){
                        return b.minrate - a.minrate;
                    })
                    [0].status.name
                    ;

				// REVERSE THE STRING AND PRINT 
				projections.reverse();
				//console.log(result);
				//console.log(projections);
				
				// Set the dimensions of the canvas / graph
				let margin = {top: 30, right: 50, bottom: 30, left: 20};
				let width = 600 - margin.left - margin.right;
				let height = 480 - margin.top - margin.bottom;
				
				// Set the ranges
				let x = d3.scaleTime().range([0, width]);
				let y = d3.scaleLinear().range([height, 0]);
				// Scale the range of the data
				x.domain(d3.extent(result.rows, function(d) { return app.parseDate(d.key[2]); }));
				y.domain([0, 1]);
				
				
				// Define the axes
				let xAxis = d3.axisBottom().scale(x).ticks(5);
				let yAxis = d3.axisRight().scale(y).ticks(5);
				
				// Define the line
				let lineOf = d3.line()
					.curve(d3.curveStepBefore)
					.x(function(d) {
					    let rtn = d.key[2];
						rtn = app.parseDate(d.key[2]);
						rtn = x(rtn);
						return rtn;
					})
					.y(function(d) { 
						return y(d.value.of); 
					})
					;
				let lineGrade = d3.line()
					.curve(d3.curveStepBefore)
					.x(function(d) { 
						d = app.parseDate(d.key[2]); 
						return x(d); 
					})
					.y(function(d) { return y(d.value.grade); })
					;
				let linePossible = d3.line()
					.curve(d3.curveCatmullRom)
					.x(function(d) {
						d = app.parseDate(d.date); 
						d = x(d);;
						return d; 
					})
					.y(function(d) {
						d = d.possible;
						d = y(d);
						return d;
					})
					;
				let lineExpected = d3.line()
					.curve(d3.curveCatmullRom)
					.x(function(d) {
						d = app.parseDate(d.date); 
						d = x(d);;
						return d; 
					})
					.y(function(d) {
						d = d.avg;
						d = y(d);
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
						.attr("width", width + margin.left + margin.right)
						.attr("height", height + margin.top + margin.bottom)
					.append("g")
						.attr("transform","translate(" + margin.left + "," + margin.top + ")")
					;
				
				// Add the valueline path.
				svg.append("path")
					.attr("fill", "none")
					.attr("stroke", "black")
					.attr("d", lineOf(result.rows))
					;
				svg.append("path")
					.attr("fill", "none")
					.attr("stroke", "green")
					.attr("d", lineGrade(result.rows))
					;
				
				// Add the X Axis
				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis)
					;
				
				// Add the Y Axis
				svg.append("g")
					.attr("class", "y axis")
					.attr("transform", "translate("+width+",0)")
					.call(yAxis)
					;
				
				let gradeVals = projections.map((d)=>{
					let date = d.date;
					d = JSON.clone(projections[0]);
					d.date = date;
					return d;
				});
				let randVals = projections.map((d,i)=>{
					d = JSON.clone(d);
					d.possible = (!i)?d.possible:Math.random();
					return d;
				});
				let accordianVals = projections.map((d,i)=>{
					d = JSON.clone(d);
					d.date = projections[0].date;
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
						.attr("d", linePossible(projections))
					;
				svg.append("path")
					.attr("fill", "none")
					.attr("stroke", "steelblue")
					.attr("stroke-width", 3)
					.attr('opacity',0)
					.attr("d", linePossible(projections))
					.transition()
						.delay(2300)
						.duration(1)
						.attr('opacity',1)
					.transition()
						.duration(1000)
						.ease(d3.easeElasticOut)
						.attr("d", lineExpected(projections))
					;
				svg.append("path")
					.attr("fill", "none")
					.attr("stroke", "steelblue")
					.attr("stroke-width", 3)
					.attr('opacity',0)
					.attr("d", linePossible(projections))
					.transition()
						.delay(2300)
						.duration(1)
						.attr('opacity',1)
					.transition()
						.duration(1000)
						.ease(d3.easeElasticOut)
						.attr("d", linePossible(gradeVals))
					;
				// Today Line
				let xToday = x(app.parseDate(effective));
				let todayMarker = svg
				    .selectAll('g#today')
				    .data([effective])
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
					.text(effective)
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
					.text(effective)
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
					.attr('d', ['M',0,',',height,' Q ',xToday,',',height,' ',xToday,',',height,' Q ',xToday,',',height,' ',width,',',height].join(''))
					.transition()
						.delay(100)
						.duration(1000)
						.attr('opacity', 1)
						.attr('d', [
							'M',xToday,',',height,
							' Q ',xToday,',',height,' ',xToday,',',rectSize.height,
							' Q ',xToday,',',height,' ',xToday,',',height
							].join(''))
					;

			})
			.catch(function(err){
				console.log(err);
			});
	},1000);
}
