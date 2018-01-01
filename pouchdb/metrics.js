/**
 * 
 */
if(!StudentReport){
    var StudentReport = {};
}

'use strict';
StudentReport.metrics = {};
StudentReport.metrics.views = {
	'grades': {
		map: function(doc) {
			// determine if the object belongs in this listing
			if (!doc) return;
			if (doc.isConfig) return;
			if (doc.isExcused) return;
			
			let key = doc._id.split(app.KeyDelim);
			if(key[0] !== 'grade') return;
			key.shift();
			
			emit(key,{
				grade: doc.weight.grade || 0,
				of: doc.weight.of,
			});
		}.toString()
		,reduce: function(keys, values, rereduce) {
			let grade = 0;
			let of = 0;
			let count = 0;
			values.forEach(function(rec){
				grade += rec.grade;
				of += rec.of;
				count += rec.count || 1;
			});
			return {
				grade: grade,
				of:    of,
				pct:   grade/of,
				count: count
			};
		}.toString()
	},
	'gradesByDate': {
		map: function(doc) {
			// determine if the object belongs in this listing
			if (!doc) return;
			if (doc.isConfig) return;
			if (doc.isExcused) return;
			
			let key = doc._id.split(app.KeyDelim);
			if(key[0] !== 'grade') return;
			key.shift();
			// move the date from the end to the start
			let classId = key.shift();
			let studentId = key.shift();
			let gradeDate = key.pop();
			key.unshift(gradeDate);
			key.unshift(studentId);
			key.unshift(classId);
			
			emit(key,{
				grade: doc.weight.grade || 0,
				of: doc.weight.of,
			});
		}.toString()
		,reduce: function(keys, values, rereduce) {
			let grade = 0;
			let of = 0;
			let count = 0;
			values.forEach(function(rec){
				grade += rec.grade;
				of += rec.of;
				count += rec.count || 1;
			});
			return {
				grade: grade,
				of:    of,
				pct:   grade/of,
				count: count
			};
		}.toString()
    },

	'attendance': {
		map: function(doc) {
			// determine if the object belongs in this listing
			if (!doc) return;
			if (doc.isConfig) return;
			if (doc.isExcused) return;
			
			let key = doc._id.split(app.KeyDelim);
			if(key[0] !== 'attend') return;
			key.shift();
			
			emit(key,doc.attendance);
			//emit(key, {
            //    date: doc.date,
            //    attendance: doc.attendance,
			//});
        }.toString()
        //,reduce:"_stats"
        
        ,reduce: function(keys,values,rereduce){
            let vals = values;
            if(!rereduce){
                vals = vals.map(function(d){
                    return {
                        sum:d||0,
                        count:1,
                    };
                });
            }
            vals = vals.reduce(function(a,d){
                    a.sum += d.sum;
                    a.count += d.count;
                    return a;
                },{sum:0,count:0});
            return vals;
        }.toString()
        
    },

   'students': {
		map: function(doc) {
		    if(!doc.student) return;
		    if(!doc.student.Username ) return;
		    //console.log(doc.student);
		    let key = [
		        doc.student.Username,
		        doc.student.LastName,
		        doc.student.FirstName,
            ];
			emit(key,doc.student);
        }.toString(),
        reduce:"_count"
    },
    
	'courses': {
		map: function(doc) {
			// determine if the object belongs in this listing
			if (!doc.course) return;
			if (doc.isConfig) return;
			
			let date = doc.date || null;
			if(date){
				date = (new Date(date)).getTime();
			}
			emit(doc.course,{
					min:date,
					max:date
				});
		}.toString(),
		reduce: function(keys,values,rereduce){
			let val = values.reduce(function(agg,d){
					agg.min = Math.min(agg.min, d.min || agg.min);
					agg.max = Math.max(agg.max, d.max || agg.max);
					return agg;
				},JSON.clone(values[0]));
			return val;
		}.toString()
	},

};

