// src/app/components/browse/browse.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowseComponent } from './browse.component';
import { NecApiService } from '../../services/nec-api.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const MOCK_ARTICLES = [
  { id: '100', number: '100', title: 'Definitions', sectionCount: 1 }
];
const MOCK_ARTICLE = {
  id: '100', number: '100', title: 'Definitions', sectionCount: 1,
  sections: [{
    id: '100.1', articleId: '100', sectionNumber: '100.1',
    sectionTitle: 'Scope', content: 'Test content here.'
  }]
};

describe('BrowseComponent', () => {
  let component: BrowseComponent;
  let fixture: ComponentFixture<BrowseComponent>;
  let necApi: jasmine.SpyObj<NecApiService>;

  beforeEach(async () => {
    necApi = jasmine.createSpyObj('NecApiService', ['getArticles', 'getArticle']);
    necApi.getArticles.and.returnValue(of(MOCK_ARTICLES));
    necApi.getArticle.and.returnValue(of(MOCK_ARTICLE));

    await TestBed.configureTestingModule({
      imports: [BrowseComponent, NoopAnimationsModule],
      providers: [{ provide: NecApiService, useValue: necApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads articles on init', () => {
    expect(necApi.getArticles).toHaveBeenCalled();
    expect(component.articles.length).toBe(1);
  });

  it('auto-selects first article on init', () => {
    expect(necApi.getArticle).toHaveBeenCalledWith('100');
  });

  it('renders an article list item for each article', () => {
    const items = fixture.nativeElement.querySelectorAll('mat-list-item');
    expect(items.length).toBe(1);
  });

  it('does not reload when the already-selected article id is passed again', () => {
    necApi.getArticle.calls.reset();
    component.selectArticle('100'); // selectedArticle.id is already '100'
    expect(necApi.getArticle).not.toHaveBeenCalled();
  });

  it('populates selectedArticle after load', () => {
    expect(component.selectedArticle?.id).toBe('100');
    expect(component.selectedArticle?.sections.length).toBe(1);
  });
});
