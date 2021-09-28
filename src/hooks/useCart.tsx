import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let newCart: Product[] = [];

      const stockProduct: Stock = await api
        .get(`stock/${productId}`)
        .then((result) => result.data);

      if (stockProduct.amount === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productCartIndex = cart.findIndex(
        (productCart) => productCart.id === productId
      );

      if (productCartIndex > -1) {
        newCart = [...cart];
        newCart[productCartIndex] = {
          ...newCart[productCartIndex],
          amount: newCart[productCartIndex].amount + 1,
        };

        if (newCart[productCartIndex].amount > stockProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      } else {
        const product = await api
          .get(`products/${productId}`)
          .then((result) => result.data);

        newCart = [...cart, { ...product, amount: 1 }];
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productCartIndex = cart.findIndex(
        (productCart) => productCart.id === productId
      );
      if (productCartIndex < 0) {
        throw new Error();
      }
      const filteredCart = cart.filter((product) => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));
      setCart(filteredCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockProduct: Stock = await api
        .get(`stock/${productId}`)
        .then((result) => result.data);

      if (amount <= 0) {
        return;
      }

      if (stockProduct.amount === 0 || amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map((product) =>
        product.id === productId
          ? {
              ...product,
              amount,
            }
          : product
      );

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
