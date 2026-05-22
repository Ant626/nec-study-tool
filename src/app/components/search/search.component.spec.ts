// src/app/components/search/search.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchComponent } from './search.component';
import { NecApiService } from '../../services/nec-api.service';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const MOCK_RESULTS = [{
  id: '210.1', articleId: '210', sectionNumber: '210.1',
  sectionTitle: 'Scope', snippet: 'Branch circuit content here…', score: 2.1
}];

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let necApi: jasmine.SpyObj<NecApiService>;

  beforeEach(async () => {
    necApi = jasmine.createSpyObj('NecApiService', ['search']);
    necApi.search.and.returnValue(of(MOCK_RESULTS));

    await TestBed.configureTestingModule({
      imports: [SearchComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [{ provide: NecApiService, useValue: necApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('does not call search on init', () => {
    expect(necApi.search).not.toHaveBeenCalled();
  });

  it('calls search after 300ms debounce when query >= 2 chars', fakeAsync(() => {
    component.query = 'branch circuit';
    component.onQueryChange();
    tick(300);
    expect(necApi.search).toHaveBeenCalledWith('branch circuit');
    expect(component.results.length).toBe(1);
  }));

  it('does not call search when query is less than 2 chars', fakeAsync(() => {
    component.query = 'a';
    component.onQueryChange();
    tick(300);
    expect(necApi.search).not.toHaveBeenCalled();
    expect(component.results).toHaveSize(0);
  }));
});
