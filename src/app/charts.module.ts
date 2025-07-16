import { NgModule } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';

@NgModule({
  exports: [NgChartsModule] // <-- rend disponible ce module aux composants standalone
})
export class ChartsModule {}
