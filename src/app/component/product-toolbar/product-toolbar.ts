import { Component, input } from '@angular/core';

@Component({
  selector: 'app-product-toolbar',
  imports: [],
  templateUrl: './product-toolbar.html',
  styleUrl: './product-toolbar.scss',
})
export class ProductToolbar {
  count = input.required<number>();
}
