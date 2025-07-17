import { Component, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent implements AfterViewInit, OnDestroy {
  scrollHandler = () => this.handleScrollAnimation();

  ngAfterViewInit(): void {
    // On écoute le scroll sur la fenêtre
    window.addEventListener('scroll', this.scrollHandler);
    // On lance aussi au chargement
    this.handleScrollAnimation();
  }

  ngOnDestroy(): void {
    // On nettoie l'écouteur pour éviter les fuites mémoire
    window.removeEventListener('scroll', this.scrollHandler);
  }

  handleScrollAnimation(): void {
    const scrollElements = document.querySelectorAll('.scroll-reveal');
    scrollElements.forEach((el) => {
      if (this.elementInView(el as HTMLElement, 100)) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    });
  }

  elementInView(el: HTMLElement, offset = 0): boolean {
    const elementTop = el.getBoundingClientRect().top;
    return elementTop <= (window.innerHeight || document.documentElement.clientHeight) - offset;
  }
}
