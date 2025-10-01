'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { formatDateBS } from '@/utils/dateFormatter';

interface DailyTrendData {
  date: string;
  liters: number;
  kg: number;
  operations: number;
  revenue: number;
}

interface DailyTrendChartProps {
  data: DailyTrendData[];
  width?: number | string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
}

export default function DailyTrendChart({ 
  data, 
  width = '100%', 
  height = 400,
  showLegend = false,
  showGrid = false,
  animate = false
}: DailyTrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !containerRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container width if width is percentage
    const containerWidth = containerRef.current.clientWidth;
    const actualWidth = typeof width === 'string' ? containerWidth : width;
    
    const margin = { top: 30, right: 100, bottom: 60, left: 80 };
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', actualWidth)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const processedData = data.map(d => ({
      ...d,
      parsedDate: parseDate(d.date)!
    }));

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.parsedDate) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.liters) || 0])
      .nice()
      .range([innerHeight, 0]);

    // Line generator
    const line = d3.line<typeof processedData[0]>()
      .x(d => xScale(d.parsedDate))
      .y(d => yScale(d.liters))
      .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerHeight);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3B82F6')
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3B82F6')
      .attr('stop-opacity', 0.05);

    // Area generator
    const area = d3.area<typeof processedData[0]>()
      .x(d => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1(d => yScale(d.liters))
      .curve(d3.curveMonotoneX);

    // Add area
    g.append('path')
      .datum(processedData)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    // Add line
    g.append('path')
      .datum(processedData)
      .attr('fill', 'none')
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    g.selectAll('.dot')
      .data(processedData)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.parsedDate))
      .attr('cy', d => yScale(d.liters))
      .attr('r', 4)
      .attr('fill', '#3B82F6')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%m/%d') as any)
        .ticks(Math.min(data.length, 10))
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280');

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `${(d as number / 1000).toFixed(0)}K`)
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280');

    // Add y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('Litara');

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Add hover effects
    g.selectAll('.dot')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', 6);

        const dataPoint = d as any;
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div><strong>${d3.timeFormat('%d.%m.%Y')(dataPoint.parsedDate)}</strong></div>
            <div>Litara: ${new Intl.NumberFormat('bs-BA').format(dataPoint.liters)}</div>
            <div>Operacije: ${dataPoint.operations}</div>
            <div>Prihod: ${new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(dataPoint.revenue)}</div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', 4);

        tooltip.style('visibility', 'hidden');
      });

    // Cleanup tooltip on unmount
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };

  }, [data, width, height, showLegend, showGrid, animate]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto" data-chart="daily-trend">
      <svg ref={svgRef} className="w-full h-auto" data-chart="daily-trend-svg"></svg>
    </div>
  );
}
