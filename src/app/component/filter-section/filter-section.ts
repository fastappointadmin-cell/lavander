import { Component, computed, input, output, signal } from '@angular/core';

export interface FilterOption {
  label: string;
  count: number;
}

@Component({
  selector: 'app-filter-section',
  imports: [],
  templateUrl: './filter-section.html',
  styleUrl: './filter-section.scss',
})
export class FilterSection {
  title = input.required<string>();
  options = input<FilterOption[]>([]);
  selectedValues = input<Set<string>>(new Set());
  valueToggled = output<string>();

  private readonly visibleLimit = 6;

  protected readonly collapsed = signal(false);
  protected readonly showAll = signal(false);

  protected readonly visibleOptions = computed(() => {
    const options = this.options();
    return this.showAll() ? options : options.slice(0, this.visibleLimit);
  });

  protected readonly hiddenCount = computed(() => Math.max(this.options().length - this.visibleLimit, 0));

  protected toggleCollapsed(): void {
    this.collapsed.set(!this.collapsed());
  }

  protected showMore(): void {
    this.showAll.set(true);
  }

  protected isSelected(label: string): boolean {
    return this.selectedValues().has(label);
  }

  protected onToggle(label: string): void {
    this.valueToggled.emit(label);
  }
}
