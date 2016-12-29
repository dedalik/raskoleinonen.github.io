/*
Copyright 2016-2017 Rasko Leinonen

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// http://www.imf.org/external/pubs/ft/weo/2016/02/weoData/download.aspx

// http://www.free-country-flags.com/countries.php

"use strict";

var weoFile = "data/WEOOct2016all.xls"; 
var countryFile = "data/country.csv";

var constant = {
	startYear: 1980,
	endYear: 2015,
	maxCountries: 20,
	minYears: 5,
	highestOrLowestCountries: 10
}

var weoData, // Data from weoFile.
	weoCountryData, // Unique country data from weoFile.
	weoSubjectData, // Unique subject data from weoFile.
	countryDataMap, // Country data from countryFile.
	yearData = Array.apply(null, Array(constant.endYear - constant.startYear + 1)).map(
		function (_, i) { return constant.startYear + i; })

var margin = {top: 50, right: 300, bottom: 50, left:100, label:25 }
var	width = 960 - margin.left - margin.right,
	height = 450 - margin.top - margin.bottom

var plot = {
	seriesColorList: d3.scaleOrdinal(d3.schemeCategory20).domain([0,constant.maxCountries-1]),
	seriesColorMap: {},
	seriesStrokeWidth: "4px",
	seriesStrokeOpacity: 0.65,
	seriesHighlightStrokeWidth: "4px",
	seriesHighlightStrokeOpacity: 1,
	seriesUnHighlightStrokeOpacity: 0.05,
	seriesMarkerRadius: "6px",
	seriesHighlightMarkerRadius: "6px",
	seriesHighlightTransitionDuration: 750,	
	seriesLegendTextFontFamily: "sans-serif",
	seriesLegendTextFontSize: "12px",
	seriesLegendTextFontWeight: "normal",
	seriesLegendColumnWidth: 150,
	axisFontFamily: "sans-serif",
	axisFontSize: "14px",
	axisFontFamily: "sans-serif",
	axisLabelFontSize: "14px",
	axisLabelFontFamily: "sans-serif",
	titleFontSize: "14px",
	titleFontFamily: "sans-serif",
	defaultTransitionDuration: 750,
	defaultTransitionEase: d3.easeCubicOut,
	svg: null,
	seriesPaths: null,
	xAxisBottom: null,
	xAxisBottomGroup: null,
	xAxisBottomClass: "xAxisBottom",
	xAxisOrigin: null,
	xAxisOriginGroup: null,	
	xAxisGrid: null,	
	xAxisGridGroup: null,
	xAxisGridClass: "xAxisGrid",
	xAxisLabel: null,
	yAxis: null,
	yAxisGroup: null,
	yAxisLabel: null,
	title: null,
	seriesLegendGroup: null
}

var RefreshType = {
	YEAR: 'YEAR',
	SUBJECT: 'SUBJECT',
	COUNTRY: 'COUNTRY',
	REGION: 'REGION',
	ALL: 'ALL',
	TOP: 'TOP',
	BOTTOM: 'BOTTOM'
}

d3.queue()
  .defer(d3.tsv, countryFile)
  .defer(d3.tsv, weoFile)
  .awaitAll(function(error, results) {
    if (error) { console.log(error); throw error; }

	// Read country data from file.
	countryDataMap = CountryDataMap.create(results[0])

	// Read weo data from file.
	weoData = WeoData.create(results[1]) 

	check.assert.instanceStrict(countryDataMap, CountryDataMap, "countryDataMap")	
	check.assert.array(weoData, "weoData");

	init();
		
	refresh(RefreshType.ALL);
}); 
  
function init() {
	console.log("init");
	
	var widthWithMargins = width + margin.left + margin.right;
	var heightWithMargins = height + margin.top + margin.bottom;

	// Append svg element.	
	plot.svg = d3.select("body").append("svg")
		.attr("width", widthWithMargins)
		.attr("height", heightWithMargins)
		.append("g")
		.attr("transform",
			  "translate(" + margin.left + "," + margin.top + ")")

	// Append a clipPath element to the group element to show
	// only the visible part of the series.
	plot.svg.append("clipPath")
		.attr("id", "series-clip")
		.append("rect")
		.attr("x", 0)
		.attr("y", 0 - margin.top)
		.attr("width", width)
		.attr("height", heightWithMargins)

	// Get unique country data from weo data.
	weoCountryData = getUniqueData(weoData,
		"countryCode", ["countryCode", "countryName"]);
	//console.log("weoCountryData: ", weoCountryData);
	
	// Get unique subject data from weo data.
	var excludeSubject = ["FLIBOR6"]
	weoSubjectData = getUniqueData(weoData,
		"subjectCode", ["subjectCode", "subjectName", "unit", "scale"], 
		excludeSubject)
	//console.log("weoSubjectData: ", weoSubjectData);
	
	initCountrySelector(['VEN', 'USA']);
	initRegionSelector();
	initSubjectSelector('BCA');
	initYearSelector();
	initHighestLowestSelector();
}

/** Initialises the country selector. May be initialized
 * any number of times. 
 */
function initCountrySelector(countryCodeArray) {
	console.log("initCountrySelector")
	check.assert.array(countryCodeArray, "countryCodeArray");
	
	if ($("#countrySelector").children().length === 0) {
		$("#countrySelector").change(function() {
			refresh(RefreshType.COUNTRY);
		});
	}
	
	$("#countrySelector").empty();
	
	initSelector(
		'countrySelector', 
		weoCountryData,
		weoCountryData.filter( function(d) {
			return undefined !== countryCodeArray.find( 
				function(countryCode) { return d.countryCode === countryCode })
		}),
		function(d) { return d.countryCode; },
		function(d) { return d.countryName; },
		{ maximumSelectionLength: constant.maxCountries } );

}

/** Initialises the region selector. May be called only once.
 */
function initRegionSelector() {
	console.log("initRegionSelector")
	
	$('#regionSelector').prepend('<option></option>');
	
	initSelector(
		'regionSelector', 
		Object.keys(region),
		null,
		function(d) { return d },
		function(d) { return d },
		{ placeholder: "Please select a region", allowClear: true }
	);

	$("#regionSelector").change(function() {
		refresh(RefreshType.REGION);
	});
}

function initSubjectSelector(subjectCode) {
	console.log("initSubjectSelector")		
	initSelector(
		'subjectSelector', 
		weoSubjectData,
		weoSubjectData.filter( 
			function(d) { return d.subjectCode === subjectCode }),
		function(d) { return d.subjectCode; },
		function(d) { return d.subjectName + " as " + d.unit + " (" + d.subjectCode + ")"; } );

	$("#subjectSelector").change(function() {
		refresh(RefreshType.SUBJECT);
	});
}

function initYearSelector() {
	initSelector(
		'fromYearSelector', 
		yearData,
		constant.startYear,
		function(d) { return d; },
		function(d) { return d; } );

	initSelector(
		'toYearSelector', 
		yearData, 
		constant.endYear,		
		function(d) { return d; },
		function(d) { return d; } );
		
	$("#fromYearSelector").change(function() {
		var fromYear = +$("#fromYearSelector").val();
		var toYear = +$("#toYearSelector").val();
		if (fromYear + constant.minYears > toYear) {
			fromYear = Math.max(constant.startYear, toYear - constant.minYears);
			// console.log("Adjusting from year: ", fromYear);
			$("#fromYearSelector").val(fromYear);
			$("#fromYearSelector").change();
		}
		else {
			refresh(RefreshType.YEAR);
		}
	});
		
	$("#toYearSelector").change(function() {
		var fromYear = +$("#fromYearSelector").val();
		var toYear = +$("#toYearSelector").val();
		//console.log("From year: ", fromYear);
		//console.log("To year: ", toYear);
		if (fromYear + constant.minYears > toYear) {
			toYear = Math.min(constant.endYear, fromYear + constant.minYears);
			console.log("Adjusting to year: ", toYear);
			$("#toYearSelector").val(toYear);			
			$("#toYearSelector").change();
		}
		else {
			refresh(RefreshType.YEAR);
		}
	});	
}

function initHighestLowestSelector() {
	$("#highestCountrySelector").click(function() {
		refresh(RefreshType.TOP);
	});

	$("#lowestCountrySelector").click(function() {
		refresh(RefreshType.BOTTOM);
	});	
}

function refresh(refreshType) {
	console.log("refresh", refreshType);	
	check.assert.string(refreshType, "refreshType");

	function getSubjectSelection() {
		var subjectCode = $('#subjectSelector').val()
		return weoSubjectData.find(function(d) { 
			return d.subjectCode === subjectCode })
	}

	function getCountrySelection() {
		var countryCodeArray = $('#countrySelector').val()
		return weoCountryData.filter(function(d) {
			return undefined !== countryCodeArray.find( 
				function(countryCode) { return d.countryCode === countryCode })
		})
	}
	
	var subjectSelection = getSubjectSelection()
		
	var fromYearSelection = +$("#fromYearSelector").val();	
	var toYearSelection = +$("#toYearSelector").val();
	
	var seriesDataArray = getSeriesData(weoData, subjectSelection);

	if (refreshType === RefreshType.TOP ||
		refreshType === RefreshType.BOTTOM) {
		var data = orderSeriesDataByValue(seriesDataArray, fromYearSelection, toYearSelection, refreshType);
		var countryCodeArray = data.slice(0, constant.highestOrLowestCountries).map(
			function(d) { return d.countryCode });		
		initCountrySelector(countryCodeArray);
	}
	else if (refreshType === RefreshType.REGION) {
		var regionSelection = $("#regionSelector").val();
		var countryCodeArray = region[regionSelection];
			initCountrySelector(countryCodeArray);
	}
	
	var countrySelection = getCountrySelection()
		
	// console.log("countrySelection: ", countrySelection);
	// console.log("subjectSelection: ", subjectSelection);
	// console.log("fromYearSelection: ", fromYearSelection);
	// console.log("toYearSelection: ", toYearSelection);
	
	var subjectCode = subjectSelection.subjectCode;
	var subject = subjectSelection.subjectName;
	var unit = subjectSelection.unit;
	var scale = subjectSelection.scale;
		
	// console.log("subjectCode: ", subjectCode);
	// console.log("subject: ", subject);
	// console.log("unit: ", unit);

	// Get data to display

	var data = []
	countrySelection.forEach(function(d) {
		var seriesData = filterSeriesDataByCountry(seriesDataArray, d)
		if (check.assigned(seriesData)) {
			data.push(seriesData)
		}
	})

	setSeriesColor(data)
	
	// console.log("Data", data);
	
	var xVisibleValues = [];
	var yVisibleValues = [0];
	
	data.forEach(function(seriesData) {
		seriesData.values.forEach(function(d) {
			var year = d.x.getFullYear();
			if (year >= fromYearSelection &&
    			year <= toYearSelection) {
				xVisibleValues.push(d.x)
				yVisibleValues.push(d.y)
				seriesData.seriesLegendY = d.y
			}
		})
	})
			
	var visibleX = d3.scaleTime().range([0, width]).domain(d3.extent(xVisibleValues));
	var visibleY = d3.scaleLinear().range([height, 0]).domain(d3.extent(yVisibleValues));

	plotXAxisOrigin(visibleX, visibleY);
	plotSeries(data, visibleX, visibleY, fromYearSelection, toYearSelection, refreshType);
	plotXAxisBottom(visibleX);
	plotXAxisGrid(visibleX);
	plotYAxis(visibleY);
	plotTitle(subject, subjectCode);
	plotXAxisLabel();
	plotYAxisLabel(unit, scale);
	plotSeriesLegend(data, visibleY);
}

function setSeriesColor(data) {	
	Object.keys(plot.seriesColorMap).forEach(function(p) {
		if (null == data.find(function(d) { return p === d.countryCode }) ) {
			delete plot.seriesColorMap[p]
		}
	})

	data.forEach(function(d) {
		var countryCode = d.countryCode
		if (!check.assigned(plot.seriesColorMap[countryCode])) {
			var colorIndex =
				d3.range(plot.seriesColorList.domain()[0],plot.seriesColorList.domain()[1]+1).find(function(colorIndex) {
					return !Object.keys(plot.seriesColorMap).find(function(countryCode) {
						return colorIndex === plot.seriesColorMap[countryCode].colorIndex
					})
				})
			var color = plot.seriesColorList(colorIndex)
			plot.seriesColorMap[countryCode] = {colorIndex: colorIndex, color: color }
		}
		d.seriesColor = plot.seriesColorMap[countryCode].color
	})
}

function plotXAxisLabel() {
	if (!check.assigned(plot.xAxisLabel)) {
		plot.xAxisLabel = plot.svg.append("text")
			.attr("y", height + 50)
			.attr("x", width / 2)
			.style("text-anchor", "middle")
			.style("font-size", plot.axisLabelFontSize)
			.style("font-family", plot.axisLabelFontFamily)
            .text("Year")
	}
}

function plotYAxisLabel(unit, scale) {
	check.assert.string(unit, "unit");
	check.assert.string(scale, "scale");
	
	if (!check.assigned(plot.yAxisLabel)) {
		plot.yAxisLabel = plot.svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left + margin.label)
		.attr("x",0 - (height / 2))
		.style("text-anchor", "middle")
		.style("font-size", plot.axisLabelFontSize)
		.style("font-family", plot.axisLabelFontFamily)
	}
	
	plot.yAxisLabel.text(unit + " " + scale);
}

function plotTitle(subject, subjectCode) {
	check.assert.string(subject, "subject");
	check.assert.string(subjectCode, "subjectCode");
		
	if (!check.assigned(plot.title)) {
		plot.title = plot.svg.append("text")
			.attr("y", - margin.label)
			.attr("x", width / 2)
			.style("text-anchor", "middle")
  			.style("font-size", plot.titleFontSize)
			.style("font-family", plot.titleFontFamily)
	}

	plot.title.text( subject + " (" + subjectCode + ")" );
}

function plotXAxisGrid(visibleX) {
	check.assert.function(visibleX, "visibleX");
	
	if (!check.assigned(plot.xAxisGridGroup)) {		
		plot.xAxisGrid = d3.axisBottom(visibleX)
			.tickSize(-height, 0, 0)
			.tickFormat("")
		plot.xAxisGridGroup = plot.svg.append("g")
			.attr("class", plot.xAxisGridClass)
			.attr("transform", "translate(0," + height + ")")
			.call(plot.xAxisGrid)
	}
	else {
		plot.xAxisGrid.scale(visibleX)		
		plot.xAxisGridGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.xAxisGrid)
	}
}

function plotXAxisOrigin(visibleX, visibleY) {
	check.assert.function(visibleX, "visibleX");
	check.assert.function(visibleY, "visibleY");	
	
	if (!check.assigned(plot.xAxisOriginGroup)) {
		plot.xAxisOrigin = d3.axisBottom(visibleX)
			.tickFormat("")
		plot.xAxisOriginGroup = plot.svg.append("g")
			.attr("transform", "translate(0," + visibleY(0) + ")")
			.call(plot.xAxisOrigin)
	}
	else {
		plot.xAxisOrigin.scale(visibleX)
		plot.xAxisOriginGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.attr("transform", "translate(0," + visibleY(0) + ")")					
			.call(plot.xAxisOrigin)
	}
}

function plotXAxisBottom(visibleX) {
	check.assert.function(visibleX, "visibleX");


	if (!check.assigned(plot.xAxisBottomGroup)) {	
		plot.xAxisBottom = d3.axisBottom(visibleX)
		plot.xAxisBottomGroup = plot.svg.append("g")
			.attr("class", plot.xAxisBottomClass)		
			.attr("transform", "translate(0," + height + ")")
  			.style("font-size", plot.axisFontSize)
			.style("font-family", plot.axisFontFamily)
			.call(plot.xAxisBottom)
	}
	else {
		plot.xAxisBottom.scale(visibleX)
		plot.xAxisBottomGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.xAxisBottom)
	}	
}

function plotYAxis(visibleY) {
	check.assert.function(visibleY, "visibleY");

	if (!check.assigned(plot.yAxisGroup)) {	
		plot.yAxis = d3.axisLeft(visibleY);	
		plot.yAxisGroup = plot.svg.append("g")
  			.style("font-size", plot.axisFontSize)
			.style("font-family", plot.axisFontFamily)		
			.call(plot.yAxis);			
	}
	else {
		plot.yAxis.scale(visibleY);
		plot.yAxisGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.yAxis);
	}
}

function plotSeries(data, visibleX, visibleY, fromYearSelection, toYearSelection, refreshType) {
	check.assert.array(data, "data");	
	check.assert.function(visibleX, "visibleX");
	check.assert.function(visibleY, "visibleY");	
	check.assert.integer(fromYearSelection, "fromYearSelection");	
	check.assert.integer(toYearSelection, "fromYearSelection");	
	check.assert.string(refreshType, "refreshType");	

	// startYear                              endYear
	//     ^                                   ^
	//     |-------------totalWidth------------|
	//     |-a-|-------width-------|-----------|
	//         v                   v 
	//      fromYear             toYear
	//		   0
	//
	// a = (fromYear-startYear) / (endYear-startYear) * totalWidth 
		
	var totalWidth = width * (constant.endYear - constant.startYear) / 
		(toYearSelection - fromYearSelection);

	var a = (fromYearSelection - constant.startYear) / 
		(constant.endYear - constant.startYear) * totalWidth;
	
	var parseTime = d3.timeParse("%Y");
	
	var allX = d3.scaleTime().range([-a,totalWidth-a]).domain(
		[parseTime(constant.startYear), parseTime(constant.endYear)]);
	
	var line = d3.line()
		.curve(d3.curveMonotoneX)// curveLinear
		.x(function(d) { return allX(d.x); })
		.y(function(d) { return visibleY(d.y); });

	if (refreshType === RefreshType.YEAR) {
		plot.seriesPaths
			.transition() 
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.on("end", function(d) { refresh(RefreshType.ALL); } )
			.attr("d", function(d) { return line(d.values); });
	}
	else {
		var seriesClass = "series"
		plot.svg
			.selectAll("." + seriesClass)
			.remove()

		plot.seriesPaths = plot.svg
			.selectAll("." + seriesClass)
			.data(data, function(d) { return d.countryCode })
			.enter()
			.append("g")
			.attr("class", seriesClass)
			.selectAll("." + seriesClass)
			.data( function(d) { return [d] } )
			.enter()
			.append("path")

		plot.seriesPaths
			.attr("d", function(d) { return line(d.values); })
			.attr("clip-path", "url(#series-clip)")
			.attr("id", function(d) { return "series_" + d.countryCode } )
			.style("fill", "none")
			.style("stroke", function(d) { return d.seriesColor })
			.style("stroke-width", plot.seriesStrokeWidth)
			.style("stroke-linejoin", "round")			
			.style("stroke-linecap", "round") 
			.style("opacity", plot.seriesStrokeOpacity)			
			.on("mouseover", function (d) { highlightSeries( d.countryCode, data ) })
			.on("mouseout", function (d) { unHighlightSeries( d.countryCode, data ) })
	}
}

function plotSeriesLegend(data, visibleY) {
	check.assert.array(data, "data");	
	check.assert.function(visibleY, "visibleY");	

	var i = 0;
	var prevY = [];
	var collisionY = 12;
	var spacingY = 20;
	function collision(y) {
		return undefined !== prevY.find(function(d) { return Math.abs(y - d) < collisionY; } )
	}
	
	var seriesLegendData = {
		nodes: data.map(function(d) {
			var y = visibleY(d.seriesLegendY);
			var column = 0;
			if (collision(y)) {
				y = i++ * spacingY;
				column = 1;
			}
			var x = width + column * plot.seriesLegendColumnWidth;
			var v = { x: x, y: y, targetX: x, targetY: y, fx: x, seriesColor: d.seriesColor }
			v.countryName = d.countryName;
			v.countryCode = d.countryCode;
			prevY.push(y);
			return v;
		})
	}

	// console.log("seriesLegendData:",seriesLegendData);

	if (!check.assigned(plot.seriesLegendGroup)) {	
		plot.seriesLegendGroup = plot.svg.append("g")
	}
	
	plot.seriesLegendGroup.selectAll("*").remove()
	
	var seriesLegendText = plot.seriesLegendGroup.selectAll("text")
		.data(seriesLegendData.nodes)
	seriesLegendText.exit().remove()	
	seriesLegendText = seriesLegendText.enter().append('text')
		.attr("id", function(d) { return "seriesText_" + d.countryCode } )	
		.style("font-family", plot.seriesTextFontFamily)
		.style("font-size", plot.seriesTextFontSize)
		.style("font-weight", plot.seriesTextFontWeight)
		.style("text-anchor", "left")
		.style("alignment-baseline", "central")
		.text( function(d) { return d.countryName } )
		.on("mouseover", function (d) { highlightSeries( d.countryCode, data ) })
		.on("mouseout", function (d) { unHighlightSeries( d.countryCode, data ) })
	
	var seriesLegendMarker = plot.seriesLegendGroup.selectAll("circle")
		.data(seriesLegendData.nodes)
	seriesLegendMarker.exit().remove()	
	seriesLegendMarker = seriesLegendMarker.enter().append('circle')
		.attr("id", function(d) { return "seriesMarker_" + d.countryCode } )
		.attr('r', plot.seriesMarkerRadius)
		.attr('fill', function(d) { return d.seriesColor } )
		.style("opacity", .75)
		.on("mouseover", function (d) { highlightSeries( d.countryCode, data ) })
		.on("mouseout", function (d) { unHighlightSeries( d.countryCode, data ) })

	var seriesLegendFlag = plot.seriesLegendGroup.selectAll("image")
		.data(seriesLegendData.nodes)
	seriesLegendFlag.exit().remove()	
	seriesLegendFlag = seriesLegendFlag.enter().append("svg:image")
		.attr('width', 20)
		.attr('height', 12) 
		.attr("xlink:href", function(d) { return "flags/" + d.countryCode + ".png" })
		.on("mouseover", function (d) { highlightSeries( d.countryCode, data ) })
		.on("mouseout", function (d) { unHighlightSeries( d.countryCode, data ) })

	var xTextPos = 45,
		xMarkerPos = 10,
		xFlagPos = 20,
		yFlagPos = -6
		
	seriesLegendText
	.attr('x', function(d) { return d.x + xTextPos })
	.attr('y', function(d) { return d.y })
	seriesLegendMarker
	.attr('cx', function(d) { return d.x + xMarkerPos })
	.attr('cy', function(d) { return d.y })
	seriesLegendFlag
	.attr('x', function(d) { return d.x + xFlagPos })
	.attr('y', function(d) { return d.y + yFlagPos })
}

function highlightSeries(countryCode, data) {
	check.assert.array(data, "data");	
	check.assert.string(countryCode, "countryCode");	

	function highlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesHighlightStrokeOpacity);
	}
	function unHighlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesUnHighlightStrokeOpacity)
	}
	
	d3.select('#series_' + countryCode )
		.call(highlightTransition)
		.style("stroke-width", plot.seriesHighlightStrokeWidth)
	d3.select('#seriesMarker_' + countryCode )
		.call(highlightTransition)
		.attr('r', plot.seriesHighlightMarkerRadius)
	data.forEach(function(d) {
		if (countryCode !== d.countryCode) {
			d3.select('#series_' + d.countryCode )
				.call(unHighlightTransition)			
			d3.select('#seriesMarker_' + d.countryCode )
				.call(unHighlightTransition)			
		}
	})
}

function unHighlightSeries(countryCode, data) {
	check.assert.array(data, "data");	
	check.assert.string(countryCode, "countryCode");	
	
	function unHighlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesStrokeOpacity)
	}

	data.forEach(function(d) {
		d3.select('#series_' + d.countryCode )
			.call(unHighlightTransition)
			.style("stroke-width", plot.seriesStrokeWidth) 
		d3.select('#seriesMarker_' + d.countryCode )
			.call(unHighlightTransition)
			.attr('r', plot.seriesMarkerRadius)
	})
}


function getUniqueData(data, uniqueProperty, returnProperty, excludeValue) {
	check.assert.array(data, "data");
	check.assert.string(uniqueProperty, "uniqueProperty");
	check.assert.assigned(returnProperty, "returnProperty");
	if ( !check.array(returnProperty) ) {
		returnProperty = [ returnProperty ];
	}
	check.assert.array.of.string(returnProperty);
	if ( check.assigned(excludeValue) ) {
		if ( !check.array(excludeValue) ) {
			excludeValue = [ excludeValue ];
		}
		check.assert.array.of.string(excludeValue);
	}

	var uniqueValues = [];
	var uniqueObjects = [];
	data.forEach(function(d) {
		var value = d[uniqueProperty]
		if (check.assigned(excludeValue) &&
			excludeValue.find(function(d) { return value === d } )) {
			// console.info("Excluding: ", value)
			return
		}

		if (check.assigned(value) && uniqueValues.indexOf(value) === -1) {
			uniqueValues.push(value);
			var uniqueObject = {};
			returnProperty.forEach(function(property) {
				uniqueObject[property] = d[property];
			});
            uniqueObjects.push( uniqueObject );
		}
	});
	return uniqueObjects;
}

function initSelector(id, data, selectedData, valueCallback, textCallback, options) {
	check.assert.string(id, "id");			
	check.assert.array(data, "data");
	if ( check.assigned(selectedData) ) {
		if ( !check.array(selectedData) ) {
			selectedData = [ selectedData ];
		}
	}
	check.assert.function(valueCallback, "valueCallback");
	check.assert.function(textCallback, "textCallback");
	if ( check.assigned(options) ) {
		check.assert.object(options, "options" );
	}

	var selector = $('#' + id);
	data.forEach( function(d) {
		var option =
		$('<option />', {
			value: valueCallback(d), 
			text: textCallback(d)
		});
		option.appendTo(selector);
	});
	if (check.assigned(selectedData) ) {
		selector.val(selectedData.map(valueCallback));
	}
	if (check.assigned(options) ) {
		selector.select2(options);
	}
	else {
		selector.select2();
	}
	return selector;
}

function getSeriesData(
	weoData,
	subjectSelection) {
	//console.log("getSeriesData");	
	check.assert.array(weoData, "weoData");
	check.assert.object(subjectSelection, "subjectSelection");			

	var data = [];
	
	var subjectCode = subjectSelection.subjectCode;
	var subject = subjectSelection.subjectName;
	
	// console.log("filter subjectCode: ", subjectCode);

	var parseTime = d3.timeParse("%Y");
	weoData.forEach(function(d) {
        if (subjectCode == d.subjectCode) {
			var countryCode = d.countryCode;
			var countryName = d.countryName;
			var seriesValues = []
			d.values.forEach(function(value) {
				seriesValues.push(new SeriesDataValue(
					parseTime(value.year), value.value)) 
			})
			if ( seriesValues.length > 0 ) {
				var seriesData = new SeriesData(
					countryCode, countryName, seriesValues);
				data.push(seriesData);
			}
		};		
	});	
	// console.log("SeriesDataArray:", data)
	return data;
}  

function filterSeriesDataByCountry(
	seriesDataArray,
	countrySelection) {
	// console.log("filterSeriesDataByCountry");	
	check.assert.array(seriesDataArray, "seriesDataArray");
	check.assert.object(countrySelection, "countrySelection");				
	
	var data = null;
	
	var countryCode = countrySelection.countryCode;
	seriesDataArray.forEach(function(d) {
		if (countryCode == d.countryCode) {
			data = d;
		}
	});
	return data;
}  

function orderSeriesDataByValue(
	seriesDataArray,
	fromYearSelection,
	toYearSelection,
	refreshType) {	
	//console.log("orderSeriesDataByValue");
	check.assert.array(seriesDataArray, "seriesDataArray");
	check.assert.integer(fromYearSelection, "fromYearSelection");	
	check.assert.integer(toYearSelection, "toYearSelection");	
	check.assert.string(refreshType, "refreshType");
	
	seriesDataArray.forEach(function(d) {
		var yValues = []
		d.values.forEach(function(d) {
			var year = d.x.getFullYear()
			if (year >= fromYearSelection &&
    			year <= toYearSelection) {
				yValues.push(d.y)
			}
		})
		d.minY = d3.min(yValues)
		d.maxY = d3.max(yValues)				
	})

	switch(refreshType) {
		case RefreshType.TOP:
			return seriesDataArray.sort(function (a, b) {
				if (a.maxY > b.maxY) {return -1 }
				if (a.maxY < b.maxY) { return 1 }
				return 0
			});				
		case RefreshType.BOTTOM:
			return seriesDataArray.sort(function (a, b) {
				if (a.minY < b.minY) {return -1 }
				if (a.minY > b.minY) { return 1 }
				return 0
			});
		default:
			return null;
	}
}

// CountryDataMap
//

function CountryDataMap(countryDataArray) {
	check.assert.array.of.instanceStrict(countryDataArray, CountryData)
	var countryDataMap = this
	countryDataArray.forEach(function(d) { countryDataMap[d.countryCode] = d })
}

CountryDataMap.prototype.getCountryDataByCountryCode = function(countryCode) {
	if (this.hasOwnProperty(countryCode)) {
		return this[countryCode]
	}
	console.error("Unknown country code: ", countryCode)
	return null
}

/** Creates a CountryDataMap object from d3.tsv result.
*/
CountryDataMap.create = function(result) {
	var countryCodeColumn     = "ISO_ALPHA3", // ISO three letter country code
		countryNameColumn     = "COUNTRY_NAME",
		longCountryNameColumn = "LONG_COUNTRY_NAME"
		// "ISO_ALPHA2" 
		// "ISO_NUMERIC"

	var countryDataArray = result.map(function(d) {
		return new CountryData(
			d[countryCodeColumn], 
			d[countryNameColumn], 
			d[longCountryNameColumn])
	})
	//console.log("countryDataArray:", countryDataArray)
	var countryDataMap = new CountryDataMap(countryDataArray)
	//console.log("countryDataMap:", countryDataMap)
	return countryDataMap	
}

// CountryData
//

function CountryData(countryCode, countryName, longCountryName) {
	check.assert.string(countryCode, "countryCode");
	check.assert.string(countryName, "countryName");
	check.assert.string(longCountryName, "longCountryName");	
    this.countryCode = countryCode;
    this.countryName = countryName;
    this.longCountryName = longCountryName;	
}

// WeoData
//

function WeoData(countryCode, countryName, subjectCode, subjectName, unit, scale, values) {
	check.assert.string(countryCode);
	check.assert.string(countryName);
	check.assert.string(subjectCode);
	check.assert.string(subjectName);
	check.assert.string(unit);
	check.assert.string(scale);	
	check.assert.array.of.instanceStrict(values, WeoDataValue);	
	this.countryCode = countryCode;
	this.countryName = countryName;
	this.subjectCode = subjectCode;
	this.subjectName = subjectName;	
	this.unit = unit;
	this.scale = scale;	
	this.values = values;
}

/** Creates an array of WeoData objects from d3.tsv result.
*/
WeoData.create = function(result) {	
var countryCodeColumn = "ISO", // ISO three letter country code
	countryNameColumn = "Country",
	subjectCodeColumn = "WEO Subject Code",
	subjectNameColumn = "Subject Descriptor",
	unitColumn = "Units",
	scaleColumn = "Scale"
	// "WEO Country Code"
	// "Subject Notes"
	// "Country/Series-specific Notes"
	// "Estimates Start After"
	
	var weoData = []
	result.forEach( function(d) { 
		var countryCode = d[countryCodeColumn]
		var countryName = d[countryNameColumn]
		var subjectCode = d[subjectCodeColumn]
		var subjectName = d[subjectNameColumn]
		var unit = d[unitColumn]
		var scale = d[scaleColumn]
		var countryData = countryDataMap
			.getCountryDataByCountryCode(countryCode)
		if (countryData != null) {
			// Overwrite country name
			countryName = countryData.countryName
		} else {
			// console.error("Missing country name: ", countryCode)
		}
		var values = []
		yearData.forEach(function(year) {
			var value = parseFloat( d[year].replace(/,/g,'') )
			if (!isNaN(value)) {
				values.push( new WeoDataValue(year, value)); }
		});
		if ( values.length > 0 ) {
			weoData.push(new WeoData(countryCode, countryName, 
				subjectCode, subjectName, unit, scale, values))
		}
	})
	// console.log("weoData:", weoData)
	return weoData
}

// WeoData
//

function WeoDataValue(year, value) {
	check.assert.integer(year);
	check.assert.number(value);	
	this.year = year;
	this.value = value;
}

// SeriesData
//

function SeriesData(countryCode, countryName, values) {
	check.assert.string(countryCode);
	check.assert.string(countryName);
	check.assert.array.of.instanceStrict(values, SeriesDataValue);	
	this.countryCode = countryCode;
	this.countryName = countryName;
	this.values = values;
}

// SeriesDataValue
//

function SeriesDataValue(x, y) {
	check.assert.instanceStrict(x, Date);	
	check.assert.number(y);
	this.x = x;
	this.y = y;
}

/** Regions organised as single object with UN (and other) 
 * region names as properties. Each region is associated 
 * with an array of ISO three letter country codes.
 * Source: http://unstats.un.org/unsd/methods/m49/m49regin.htm
 */
var region = {
	"Eastern Africa": [
		"BDI", "COM", "DJI", "ERI", "ETH", "KEN", "MDG", "MWI", "MUS", "MOZ", 
		"RWA", "SYC", "SSD", "UGA", "TZA", "ZMB", "ZWE"],
	"Middle Africa": [
		"AGO", "CMR", "CAF", "TCD", "COD", "COD", "GNQ", "GAB", "STP"],
	"Northern Africa": [
		"DZA", "EGY", "LBY", "MAR", "SDN", "TUN"],
	"Southern Africa": [
		"BWA", "LSO", "NAM", "ZAF", "SWZ"],
	"Western Africa": [
		"BEN", "BFA", "CPV", "CIV", "GMB", "GHA", "GNQ", "GNB", "LBR", "MLI", 
		"MRT", "NER", "NGA", "SEN", "SLE", "TGO"],
	"Caribbean": [
		"ATG", "BHS", "BRB", "DMA", "DOM", "GRD", "HTI", "JAM", "PRI", "TTO"],
	"Central America": [
		"BLZ", "CRI", "SLV", "GTM", "HND", "MEX", "NIC", "PAN"],
	"South America": [
		"ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUY", "PRY", "PER", "SUR", 
		"URY", "VEN"],
	"Northern America": [
		"CAN", "USA"],
	"Central Asia": [
		"KAZ", "TJK", "TKM", "UZB"],
	"Eastern Asia": [
		"CHN", "HKG", "MAC", "KOR", "JPN", "MNG"],
	"Southern Asia": [
		"AFG", "BGD", "BTN", "IND", "IRN", "MDV", "NPL", "PAK", "LKA"],
	"South-Eastern Asia": [
		"BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "TLS", 
		"VNM"],
	"Western Asia": [
		"ARM", "AZE", "BHR", "CYP", "GEO", "IRQ", "ISR", "JOR", "KWT", "LBN", 
		"OMN", "QAT", "SAU", "SYR", "TUR", "ARE", "YEM"],
	"Eastern Europe": [
		"BLR", "BGR", "CZE", "HUN", "POL", "MDA", "ROU", "RUS", "SVK", "UKR"],
	"Northern Europe": [
		"DNK", "EST", "FIN", "ISL", "IRL", "LVA", "LTU", "NOR", "SWE", "GBR"],
	"Nordic Countries": [
		"SWE", "NOR", "ISL", "FIN", "DNK" ],		
	"Southern Europe": [
		"ALB", "BIH", "HRV", "GRC", "ITA", "MLT", "MNE", "PRT", "SMR", "SRB", 
		"SVN", "ESP", "MKD"],
	"Western Europe": [
		"AUT", "BEL", "FRA", "DEU", "LUX", "NLD", "CHE"],
	"Australia and New Zealand": [
		"AUS", "NZL"],
	"Melanesia": [
		"FJI", "PNG", "SLB", "VUT"],
	"Micronesia": [
		"KIR", "MHL", "FSM", "PLW"],
	"Polynesia": [
		"WSM", "TON", "TUV"],
	"Opec Countries": [
		"DZA", "AGO", "ECU", "IRN", "IRQ", "KWT", "LBY", "NGA", "QAT", "SAU", 
		"ARE", "VEN"],
	"G8 Countries": [
		"JPN","RUS","USA","GBR","ITA","DEU","CAN","FRA"],	
	"BRICS Countries": [
		"RUS","CHN", "IND", "BRA", "ZAF"]	
}
