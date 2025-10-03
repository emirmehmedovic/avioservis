'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Download } from 'lucide-react';
import * as d3 from 'd3';
import { formatDateBS } from '@/utils/dateFormatter';

export interface ChartDataPoint {
  period: string;
  current: number;
  previous: number;
  growth?: number;
  label?: string;
}

export interface ComparisonChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  type?: 'line' | 'bar' | 'area';
  height?: number;
  showGrowth?: boolean;
  loading?: boolean;
  onExport?: () => void;
  className?: string;
  period1Label?: string;
  period2Label?: string;
  metricLabel?: string;
  metricUnit?: string;
}

export default function ComparisonChart({
  data,
  title,
  subtitle,
  type = 'line',
  height = 300,
  showGrowth = true,
  loading = false,
  onExport,
  className = '',
  period1Label = 'Prethodni period',
  period2Label = 'Trenutni period',
  metricLabel = 'Vrijednost',
  metricUnit = ''
}: ComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  console.log('Debug - ComparisonChart data:', data);
  console.log('Debug - ComparisonChart data length:', data?.length);
  console.log('Debug - ComparisonChart first item:', data?.[0]);

  useEffect(() => {
    if (!data.length || loading || !chartRef.current) return;

    // Validate data for NaN values
    const validData = data.filter(item => 
      !isNaN(item.current) && !isNaN(item.previous) && 
      isFinite(item.current) && isFinite(item.previous)
    );
    
    if (validData.length === 0) {
      console.log('Debug - ComparisonChart: No valid data found');
      return;
    }
    
    console.log('Debug - ComparisonChart validData:', validData);

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 50, right: 150, bottom: 150, left: 120 };
    const containerWidth = chartRef.current.clientWidth || 800;
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", containerWidth)
      .attr("height", height)
      .attr("class", "w-full h-full chart-svg")
      .attr("data-chart", "comparison-chart");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse periods and prepare data
    const processedData = validData.map((d, i) => ({
      ...d,
      index: i,
      periodDate: new Date(d.period) // Assume period is a date string
    }));

    // Scales
    const xScale = d3.scaleBand()
      .domain(processedData.map(d => d.period))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => Math.max(d.current, d.previous)) || 0])
      .nice()
      .range([chartHeight, 0]);

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(['current', 'previous'])
      .range(['#3b82f6', '#ef4444']);

    // Axes
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale));

    // Rotate x-axis labels if needed
    xAxis.selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "1.5em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "10px")
      .style("fill", "#374151");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")))
      .selectAll("text")
      .style("font-size", "12px");

    // Chart rendering based on type
    if (type === 'bar') {
      const barWidth = xScale.bandwidth() / 2;
      
      // Current period bars
      g.selectAll(".bar-current")
        .data(processedData)
        .enter().append("rect")
        .attr("class", "bar-current")
        .attr("x", d => (xScale(d.period) || 0) + barWidth * 0.1)
        .attr("y", d => yScale(d.current))
        .attr("width", barWidth * 0.8)
        .attr("height", d => chartHeight - yScale(d.current))
        .attr("fill", colorScale('current') as string)
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
          // Tooltip
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <div><strong>${d.period}</strong></div>
            <div>${period2Label}: ${formatNumber(d.current)}${metricUnit}</div>
            <div>${period1Label}: ${formatNumber(d.previous)}${metricUnit}</div>
            <div>Rast: ${formatGrowth(d.growth)}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function() {
          d3.selectAll(".tooltip").remove();
          d3.select(this).attr("opacity", 0.8);
        });

      // Previous period bars
      g.selectAll(".bar-previous")
        .data(processedData)
        .enter().append("rect")
        .attr("class", "bar-previous")
        .attr("x", d => (xScale(d.period) || 0) + barWidth * 1.1)
        .attr("y", d => yScale(d.previous))
        .attr("width", barWidth * 0.8)
        .attr("height", d => chartHeight - yScale(d.previous))
        .attr("fill", colorScale('previous') as string)
        .attr("opacity", 0.6)
        .on("mouseover", function(event, d) {
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <div><strong>${d.period}</strong></div>
            <div>${period2Label}: ${formatNumber(d.current)}${metricUnit}</div>
            <div>${period1Label}: ${formatNumber(d.previous)}${metricUnit}</div>
            <div>Rast: ${formatGrowth(d.growth)}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          d3.select(this).attr("opacity", 0.8);
        })
        .on("mouseout", function() {
          d3.selectAll(".tooltip").remove();
          d3.select(this).attr("opacity", 0.6);
        });

    } else if (type === 'line') {
      // Line generators
      const line = d3.line<any>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.current))
        .curve(d3.curveMonotoneX);

      const previousLine = d3.line<any>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.previous))
        .curve(d3.curveMonotoneX);

      // Current period line
      g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", colorScale('current') as string)
        .attr("stroke-width", 3)
        .attr("d", line);

      // Previous period line
      g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", colorScale('previous') as string)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("d", previousLine);

      // Data points
      g.selectAll(".dot-current")
        .data(processedData)
        .enter().append("circle")
        .attr("class", "dot-current")
        .attr("cx", d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.current))
        .attr("r", 5)
        .attr("fill", colorScale('current') as string)
        .on("mouseover", function(event, d) {
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <div><strong>${d.period}</strong></div>
            <div>${period2Label}: ${formatNumber(d.current)}${metricUnit}</div>
            <div>${period1Label}: ${formatNumber(d.previous)}${metricUnit}</div>
            <div>Rast: ${formatGrowth(d.growth)}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          d3.select(this).attr("r", 7);
        })
        .on("mouseout", function() {
          d3.selectAll(".tooltip").remove();
          d3.select(this).attr("r", 5);
        });

      g.selectAll(".dot-previous")
        .data(processedData)
        .enter().append("circle")
        .attr("class", "dot-previous")
        .attr("cx", d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.previous))
        .attr("r", 5)
        .attr("fill", colorScale('previous') as string)
        .on("mouseover", function(event, d) {
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <div><strong>${d.period}</strong></div>
            <div>${period2Label}: ${formatNumber(d.current)}${metricUnit}</div>
            <div>${period1Label}: ${formatNumber(d.previous)}${metricUnit}</div>
            <div>Rast: ${formatGrowth(d.growth)}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          d3.select(this).attr("r", 7);
        })
        .on("mouseout", function() {
          d3.selectAll(".tooltip").remove();
          d3.select(this).attr("r", 5);
        });

    } else if (type === 'area') {
      // Area generators
      const area = d3.area<any>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y0(chartHeight)
        .y1(d => yScale(d.current))
        .curve(d3.curveMonotoneX);

      const previousArea = d3.area<any>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y0(chartHeight)
        .y1(d => yScale(d.previous))
        .curve(d3.curveMonotoneX);

      // Previous period area (behind)
      g.append("path")
        .datum(processedData)
        .attr("fill", colorScale('previous') as string)
        .attr("opacity", 0.4)
        .attr("d", previousArea);

      // Current period area (in front)
      g.append("path")
        .datum(processedData)
        .attr("fill", colorScale('current') as string)
        .attr("opacity", 0.6)
        .attr("d", area);
    }

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${width - 180}, 40)`);

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colorScale('current') as string);

    legend.append("text")
      .attr("x", 18)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text(period2Label);

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 20)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colorScale('previous') as string);

    legend.append("text")
      .attr("x", 18)
      .attr("y", 29)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text(period1Label);

  }, [data, loading, type, height]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('bs-BA').format(Math.round(num));
  };

  const formatGrowth = (growth: number | undefined): string => {
    if (growth === undefined || isNaN(growth)) return 'N/A';
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number | undefined): string => {
    if (growth === undefined || isNaN(growth)) return 'text-gray-600';
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Izračunaj summary statistike
  const totalCurrent = data.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = data.reduce((sum, point) => sum + point.previous, 0);
  const overallGrowth = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {showGrowth && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Ukupna promjena</div>
                <div className={`text-lg font-semibold ${getGrowthColor(overallGrowth)}`}>
                  {formatGrowth(overallGrowth)}
                </div>
              </div>
            )}
            
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Eksportiraj chart"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div
          ref={chartRef}
          style={{ height: `${height}px` }}
          className="w-full"
          data-chart="comparison-chart"
        />
      </div>

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">{period2Label}</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(totalCurrent)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-600">{period1Label}</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(totalPrevious)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-600">Razlika</div>
              <div className={`text-xl font-semibold ${getGrowthColor(overallGrowth)}`}>
                {formatNumber(totalCurrent - totalPrevious)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Points Preview (for debugging) */}
      {process.env.NODE_ENV === 'development' && data.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 mb-2">
              Debug: Data Points ({data.length})
            </summary>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.map((point: any, index: number) => (
                <div key={index} className="flex justify-between text-gray-700">
                  <span>{point.period}</span>
                  <span>
                    {formatNumber(point.current)} / {formatNumber(point.previous)} 
                    ({formatGrowth(point.growth)})
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </motion.div>
  );
}
