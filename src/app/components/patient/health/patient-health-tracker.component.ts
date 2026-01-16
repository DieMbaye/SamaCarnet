import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-health-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-health-tracker.component.html',
  styleUrls: ['./patient-health-tracker.component.css']
})
export class HealthTrackerComponent implements OnInit {
  selectedMetric = 'bloodPressure';
  metrics = [
    { id: 'bloodPressure', name: 'Tension artérielle', unit: 'mmHg', icon: 'fas fa-heartbeat' },
    { id: 'bloodSugar', name: 'Glycémie', unit: 'mg/dL', icon: 'fas fa-tint' },
    { id: 'weight', name: 'Poids', unit: 'kg', icon: 'fas fa-weight' },
    { id: 'temperature', name: 'Température', unit: '°C', icon: 'fas fa-thermometer-half' },
    { id: 'pulse', name: 'Pouls', unit: 'bpm', icon: 'fas fa-heart' },
  ];

  newMeasurement = {
    value: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    notes: ''
  };

  measurements: any[] = [];
  healthChart: any;

  async ngOnInit() {
    this.loadMeasurements();
    this.createChart();
  }

  loadMeasurements() {
    // Charger depuis localStorage ou API
    const saved = localStorage.getItem(`health_${this.selectedMetric}`);
    if (saved) {
      this.measurements = JSON.parse(saved);
    }
  }

  createChart() {
    const ctx = document.getElementById('healthChart') as HTMLCanvasElement;
    
    if (this.healthChart) {
      this.healthChart.destroy();
    }

    const data = this.measurements.map(m => m.value);
    const labels = this.measurements.map(m => `${m.date} ${m.time}`);

    this.healthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: this.getCurrentMetric().name,
          data: data,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: this.getCurrentMetric().unit
            }
          }
        }
      }
    });
  }

  getCurrentMetric() {
    return this.metrics.find(m => m.id === this.selectedMetric) || this.metrics[0];
  }

  addMeasurement() {
    if (!this.newMeasurement.value) return;

    const measurement = {
      ...this.newMeasurement,
      metric: this.selectedMetric,
      timestamp: new Date()
    };

    this.measurements.unshift(measurement);
    this.saveMeasurements();
    this.newMeasurement = {
      value: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      notes: ''
    };

    this.createChart();
  }

  saveMeasurements() {
    localStorage.setItem(`health_${this.selectedMetric}`, JSON.stringify(this.measurements));
  }

  deleteMeasurement(index: number) {
    this.measurements.splice(index, 1);
    this.saveMeasurements();
    this.createChart();
  }

  exportData() {
    const dataStr = JSON.stringify(this.measurements, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `sante_${this.selectedMetric}_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  }

  switchMetric(metricId: string) {
    this.selectedMetric = metricId;
    this.loadMeasurements();
    this.createChart();
  }

  getStats() {
    if (this.measurements.length === 0) return null;
    
    const values = this.measurements.map(m => parseFloat(m.value));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const last = values[0];
    
    return { avg, max, min, last };
  }
}