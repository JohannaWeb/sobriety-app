import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-resources',
  imports: [MatListModule],
  templateUrl: './resources.html',
  styleUrl: './resources.scss',
})
export class Resources {
  resources = [
    {
      name: 'Alcoholics Anonymous',
      url: 'https://www.aa.org',
    },
    {
      name: 'SMART Recovery',
      url: 'https://www.smartrecovery.org',
    },
    {
      name: 'Women for Sobriety',
      url: 'https://womenforsobriety.org',
    },
    {
      name: 'Secular Organizations for Sobriety',
      url: 'https://www.sossobriety.org',
    }
  ];
}
