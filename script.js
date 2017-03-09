const margin = {top: 100, right: 50, bottom: 70, left: 100},
      width = 1210 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,
      legendMargin = {top: 30, right: 50, bottom: 30, left: 100},
      legendWidth = 500 - legendMargin.left - legendMargin.right,
      legendHeight = 90 - legendMargin.top - legendMargin.bottom,
      months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      sourceAddress = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json",
      sourceCodeAddress = "https://github.com/BrendanSweeny/heat-map.git";

// Chart x Scale
let x = d3.scaleBand()
          .rangeRound([0, width]);
// Chart y Scale
let y = d3.scaleBand()
          .rangeRound([0, height]);

// Color scale, used to fill rect based on temperature variance
let color = d3.scaleSqrt()
              .range(["rgb(36, 113, 163)", "rgb(255, 255, 255)", "rgb(144, 12, 63)"]);

// x-Axis
let xAxis = d3.axisBottom()
              .scale(x);

// Tick format for y-Axis
let formatMonth = d3.timeFormat("%B");

// y-Axis
let yAxis = d3.axisLeft()
              .scale(y)
              .tickFormat((d) => { return months[d - 1]; })

// Heat map chart
let chart = d3.select("#heat-map")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Legend SVG
let legend = d3.select("#legend")
              .attr("width", legendWidth + legendMargin.left + legendMargin.right)
              .attr("height", legendHeight + legendMargin.top + legendMargin.bottom)
              .append("g")
              .attr("transform", "translate(" + legendMargin.left + ", " + legendMargin.top + ")");

// Generates dummy "data" used to create the Legend axis from the the extent of data.variance
function generateLegendData(extent) {
  extent[0] = Math.floor(extent[0]);
  extent[1] = Math.ceil(extent[1]);

  let legendData = [];
  let datum = extent[0];
  while (datum <= extent[1]) {
    legendData.push(datum);
    datum++;
  }
  return legendData;
}

// Function that darkens input color slightly, used on mouseover
function highlightColor(rgbColor) {
  let rgbArray = rgbColor.match(/(\d+)/g);
  rgbArray.forEach((val, index) => {
    rgbArray[index] = Number(val) - 80;
    if (rgbArray[index] < 0) {
      rgbArray[index] = 0;
    }
  });
  let newColor = "rgb(" + rgbArray[0] + ", " + rgbArray[1] + ", " + rgbArray[2] + ")";
  return newColor;
}

// ToolTip
let toolTip = d3.select("body")
                .append("div")
                .attr("id", "toolTip")
                .style("display", "none")

d3.json(sourceAddress, (error, data) => {
  if (error) throw error;

  // Add the Data Source Link
  d3.select("div")
    .append("p")
    .attr("id", "source")
    .html("Source: <a href=" + sourceAddress + ">" + sourceAddress + "</a>");

  // Add Source Code Link
  d3.select("div")
    .append("p")
    .attr("id", "source-code")
    .html("Heat-Map Source Code: <a href=" + sourceCodeAddress + ">" + sourceCodeAddress + "</a>" );

  // Colorizes text based on negative/positive change in temperature
  function formatTipText(d) {
    console.log(d);
    let html = "<h4>" + months[d.month - 1] + " " + d.year + "</h4>" +
               "<p>" + (data.baseTemperature + d.variance).toFixed(2) + " &deg;C</p>";
    let color = "black";
    let variance = d.variance.toFixed(2);
    if (d.variance > 0) {
      color = "rgb(144, 12, 63)";
      variance = "+" + variance;
    } else if (d.variance < 0) {
      color = "rgb(36, 113, 163)";
    }
    let varianceText = "<p style='color: " + color + "'>&#x0394; " + variance + " &deg;C</p>";
    return html + varianceText;
  }

  // Type Coersion
  data.monthlyVariance.forEach((d) => {
    d.year = +d.year;
    d.month = +d.month;
    d.variance = +d.variance;
  })

  // Uncomment to test using smaller dataset:
  //data.monthlyVariance = data.monthlyVariance.slice(0, 100);


  let xExtent = data.monthlyVariance.map((d) => { return d.year; });
  x.domain(xExtent);

  let yExtent = data.monthlyVariance.map((d) => { return d.month; });
  y.domain(yExtent);

  let varianceExtent = d3.extent(data.monthlyVariance, (d) => {return d.variance; });
  varianceExtent = [varianceExtent[0], 0, varianceExtent[1]];
  color.domain(varianceExtent);

  // Apply data to SVG
  chart.selectAll(".cell")
       .data(data.monthlyVariance)
       .enter().append("rect")
       .attr("class", "cell")
       .attr("x", (d) => { return x(d.year); })
       .attr("y", (d) => { return y(d.month); })
       .attr("height", y.bandwidth())
       .attr("width", x.bandwidth())
       .property("data-month", (d) => { return d.month; })
       .property("data-year", (d) => { return d.year; })
       .property("data-temp", (d) => { return data.baseTemperature + d.variance; })
       .style("fill", (d) => { return color(d.variance); })
       .on("mouseover", (d, i) => {
         chart.selectAll(".cell").filter((p) => { return p === d; }).style("fill", (d) => { return highlightColor(color(d.variance))});

         toolTip
            .property("date-year", d.year)
            .style("display", "block")
            .style("left", d3.event.pageX + 20 + "px")
            .style("top", d3.event.pageY + -50 + "px")
            .html(formatTipText(d));

       })
       .on("mouseout", (d) => {
         chart.selectAll(".cell").filter((p) => { return p === d; }).style("fill", (d) => { return color(d.variance); });
         toolTip
            .style("display", "none");
       });

  // x-Axis
  chart.append("g")
       .attr("id", "x-axis")
       .attr("class", "axis")
       .attr("transform", "translate(0 , " + height + ")")
       .call(xAxis.tickValues(x.domain().filter((d, i) => { return !( i % 10 ); })));

  // y-Axis
  chart.append("g")
       .attr("id", "y-axis")
       .attr("class", "axis")
       .call(yAxis);

  // Chart Border
  chart.append("g")
       .append("rect")
       .attr("class", "border")
       .attr("height", height)
       .attr("width", width)
       .style("stroke", "black")
       .style("stroke-width", "0.2em")
       .style("shape-rendering", "crispEdges")
       .style("fill", "none");

  // x-Axis label
  chart.append("text")
       .attr("class", "label")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom * (3 / 4))
       .style("text-anchor", "middle")
       .text("Year");

  // y-Axis Label
  chart.append("text")
       .attr("class", "label")
       .attr("transform", "rotate(-90)")
       .attr("y", 0 - margin.left / 1.2)
       .attr("x", 0 - height / 2)
       .style("text-anchor", "middle")
       .text("Month");

  // Chart Title
  chart.append("text")
       .attr("id", "title")
       .attr("transform", "translate(" + width / 2 + ", "+ -(margin.top / 1.5) + ")")
       .style("text-anchor", "middle")
       .text("Monthly Global Land-Surface Temperature (1753 - 2015)");

  // Chart Subtitle
  chart.append("text")
       .attr("id", "description")
       .attr("transform", "translate(" + width / 2 + ", " + -(margin.top / 3) + ")")
       .style("text-anchor", "middle")
       .text("Base Temperature: 8.66 °C")

  // Legend //

  let legendData = generateLegendData([varianceExtent[0], varianceExtent[2]])

  // Transforms legend dummy "data" to the legend width
  let varianceScale = d3.scaleBand()
                        .domain(legendData)
                        .range([0, legendWidth]);

  // Legend x-Axis
  let legendAxis = d3.axisBottom()
                     .scale(varianceScale);

  // Legend Data
  legend.selectAll(".bar")
        .data(legendData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", (d) => { return varianceScale(d); })
        .attr("y", 0)
        .attr("height", legendHeight)
        .attr("width", varianceScale.bandwidth())
        .style("fill", (d) => { return color(d); })

  // Legend Border
  legend.append("rect")
      .attr("height", legendHeight)
      .attr("width", legendWidth)
      .attr("stroke", "black")
      .attr("stroke-width", "0.1em")
      .style("shape-rendering", "crispEdges")
      .style("fill", "none");


  // legend x-Axis
  legend.append("g")
        .attr("class", "legend-axis axis")
        .attr("transform", "translate(0 , " + legendHeight + ")")
        .call(legendAxis);

  // Legend Title
  legend.append("text")
        .attr("class", "legend-title")
        .attr("transform", "translate(" + legendWidth / 2 + ", " + -(legendMargin.top / 2) +")")
        .style("text-anchor", "middle")
        .text("Δ °C");
})
