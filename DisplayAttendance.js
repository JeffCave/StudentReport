/**
 * https://strongriley.github.io/d3/ex/calendar.html
 * https://bl.ocks.org/micahstubbs/89c6bd879d64aa511372064c6cf85711
 */
'use strict';

let DisplayAttendance_pending = false;
function DisplayAttendance(override){
	override = override || false;
	if(override){
		DisplayAttendance_pending = false;
	}
	if(DisplayAttendance_pending){
		return;
	}
	DisplayAttendance_pending = true;
	
	setTimeout(function(){
		let opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:5,
			startkey:['logprog','W0000002'],
			endkey:['logprog','W0000002',{}],
		};
		
		db.query('metrics/attendance', opts)
			.then( function(result){
				DisplayAttendance_pending = false;
				// Adds the svg canvas
				
				// Set the dimensions of the canvas / graph
                let width = 960;
                let height = 136;
                let cellSize = 17; // cell size
				//let margin = {top: 30, right: 50, bottom: 30, left: 20};
				//let width = 600 - margin.left - margin.right;
				//let height = 270 - margin.top - margin.bottom;
				
                let percent = d3.format(".1%");
                let format = d3.timeFormat("%Y-%m-%d");
                
                let color = d3.scaleQuantize()
                    .domain([0, 1])
                    .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }))
                    ;
                
                let svg = d3.select("#studentattendace").selectAll("svg")
                    .data([2017])
                    .enter().append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("class", "RdYlGn")
                    .append("g")
                        .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")")
                    ;
                
                svg.append("text")
                    .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
                    .style("text-anchor", "middle")
                    .text(function(d) {
                        return d; 
                    });
                
                
                
                function monthPath(t0) {
                    let t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                        d0 = t0.getDay(), 
                        w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
                        d1 = t1.getDay(), 
                        w1 = d3.timeWeek.count(d3.timeYear(t1), t1)
                        ;
                    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
                        + "H" + w0 * cellSize + "V" + 7 * cellSize
                        + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
                        + "H" + (w1 + 1) * cellSize + "V" + 0
                        + "H" + (w0 + 1) * cellSize + "Z"
                        ;
                }

                
                
                let rect = svg.selectAll(".day")
                    .data(function(d) {
                        return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); 
                    })
                    .enter().append("rect")
                        .attr("class", "day")
                        .attr("width", cellSize)
                        .attr("height", cellSize)
                        .attr("x", function(d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize; })
                        .attr("y", function(d) { return d.getDay() * cellSize; })
                        .datum(format);
                
                rect.append("title")
                    .text(function(d) {
                        return d; 
                    });
                
                svg.selectAll(".month")
                    .data(function(d) {
                        return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); 
                    })
                    .enter().append("path")
                        .attr("class", "month")
                        .attr("d", monthPath)
                        ;
                
                let data = result.rows.reduce(function(a,d){
                    d.key.shift();
                    d.key.shift();
                    d.key = d.key.join("-");
                    a[d.key] = (a[d.key] || 0) + d.value;
                    return a;
                },{});
                
                rect.filter(function(d){
                        let val = data[d];
                        val = isNaN(val);
                        val = !val;
                        return val;
                    })
                    .style("opacity", function(d) {
                            let rtn = data[d]; 
                            return rtn;
                        })
                    .select("title")
                        .text(function(d) {
                            return d + ": " + percent(data[d]); 
                        })
                    ;
                    
			})
			.catch(function(err){
				console.log(err);
			});
	},1000);
}