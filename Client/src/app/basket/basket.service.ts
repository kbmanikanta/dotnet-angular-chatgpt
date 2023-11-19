import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Basket, BasketItem, BasketTotal } from '../shared/models/basket';
import { Product } from '../shared/models/Product';

@Injectable({
  providedIn: 'root',
})
export class BasketService {
  private basketSubject: BehaviorSubject<Basket | null> = new BehaviorSubject<Basket | null>(null);
  basketSubject$ = this.basketSubject.asObservable();
  private basketTotalSubject = new BehaviorSubject<BasketTotal | null>(null); 
  basketTotalSubject$ = this.basketTotalSubject.asObservable();
  private readonly basketUrl = 'http://localhost:5103/api/Basket/'; 


  constructor(private http: HttpClient) {}

  getBasket(basketId: string) {
    return this.http.get<Basket>(this.basketUrl + basketId).subscribe({
      next: basket=> {
        this.basketSubject.next(basket)
        this.calculateTotal();
      }
    })
  }

  setBasket(basket:Basket) {
    return this.http.post<Basket>(this.basketUrl, basket).subscribe({
      next: basket => {
        this.basketSubject.next(basket)
        this.calculateTotal();
      }
    })
  }

  getBasketSubjectCurrentValue(){
    return this.basketSubject.value;
  }

  addItemToBasket(item: Product, quantity = 1){
    const cartItem = this.mapProductToBasket(item);
    const basket = this.getBasketSubjectCurrentValue() ?? this.createBasket();
    basket.items = this.upsertItem(basket.items, cartItem, quantity);
    this.setBasket(basket);
  }

  //Basket methods
  incrementItemQuantity(itemId: number, quantity: number = 1) {
    const basket = this.getBasketSubjectCurrentValue();
    if (basket) {
      const item = basket.items.find((p) => p.id === itemId);
      if (item) {
        item.quantity += quantity;
        if (item.quantity < 1) {
          item.quantity = 1; // Prevent negative quantity
        }
        this.setBasket(basket);
      }
    }
  }
  
  decrementItemQuantity(itemId: number, quantity: number = 1) {
    const basket = this.getBasketSubjectCurrentValue();
    if (basket) {
      const item = basket.items.find((p) => p.id === itemId);
      if (item && item.quantity > 1) {
        item.quantity -= quantity;
        this.setBasket(basket);
      }
    }
  }
  
  removeItem(itemId: number) {
    const basket = this.getBasketSubjectCurrentValue();
    if (basket) {
      const itemIndex = basket.items.findIndex((p) => p.id === itemId);
      if (itemIndex !== -1) {
        basket.items.splice(itemIndex, 1);
        this.setBasket(basket);

        // Check if the basket is empty after removing the item
        if (basket.items.length === 0) {
          // Clear the basket from local storage
          localStorage.removeItem('basket_id');
        }
      }
    }
  }

  private upsertItem(items: BasketItem[], basketItem: BasketItem, quantity: number): BasketItem[] {
    const item = items.find(p=>p.id === basketItem.id);
    if(item){
      item.quantity+= quantity;    
    }else{
      basketItem.quantity = quantity;
      items.push(basketItem);
    }
    return items;
  }
  
  private mapProductToBasket(item: Product): BasketItem {
    const basketItem: BasketItem = {
      id: item.id,
      productName: item.name,
      price: item.price,
      quantity: 0,
      pictureUrl: item.pictureUrl,
      productBrand: item.productBrand,
      productType: item.productType
    };
  
    return basketItem;
  }

  private createBasket(): Basket{
    const basket = new Basket();
    localStorage.setItem('basket_id', basket.id);
    return basket;
  }

  private calculateTotal(){
    const basket = this.getBasketSubjectCurrentValue();
    if(!basket) return;
    const shipping = 0;
    const subtotal = basket.items.reduce((x,y) => (y.price * y.quantity)+ x, 0);
    const total = subtotal + shipping;
    this.basketTotalSubject.next({shipping, total, subtotal});
  }
  
}


