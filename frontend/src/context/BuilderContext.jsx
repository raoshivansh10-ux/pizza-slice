import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const BuilderContext = createContext(null);

export const BuilderProvider = ({ children }) => {
  const [options, setOptions] = useState({
    bases: [],
    sauces: [],
    cheeses: [],
    veggies: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // Custom Pizza Selections
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [selectedCheese, setSelectedCheese] = useState(null);
  const [selectedVeggies, setSelectedVeggies] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      const res = await api.get('/pizza-options');
      setOptions({
        bases: res.data.bases || [],
        sauces: res.data.sauces || [],
        cheeses: res.data.cheeses || [],
        veggies: res.data.veggies || [],
      });
    } catch (err) {
      setOptionsError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const toggleVeggie = (veggie) => {
    setSelectedVeggies((prev) => {
      const exists = prev.some((v) => v._id === (veggie._id || veggie));
      if (exists) {
        return prev.filter((v) => v._id !== (veggie._id || veggie));
      } else {
        return [...prev, veggie];
      }
    });
  };

  // Pre-fill builder with exact configuration from a past order (Reorder flow)
  const loadPizzaConfiguration = ({ base, sauce, cheese, veggies = [], qty = 1 }) => {
    // Look up freshest active option from options list or use provided object
    const baseId = base?._id || base;
    const sauceId = sauce?._id || sauce;
    const cheeseId = cheese?._id || cheese;

    const matchedBase = options.bases.find((b) => b._id === baseId) || base;
    const matchedSauce = options.sauces.find((s) => s._id === sauceId) || sauce;
    const matchedCheese = options.cheeses.find((c) => c._id === cheeseId) || cheese;

    const matchedVeggies = (veggies || [])
      .map((v) => {
        const vId = v?._id || v;
        return options.veggies.find((optVeg) => optVeg._id === vId) || v;
      })
      .filter(Boolean);

    setSelectedBase(matchedBase);
    setSelectedSauce(matchedSauce);
    setSelectedCheese(matchedCheese);
    setSelectedVeggies(matchedVeggies);
    setQuantity(Math.max(1, parseInt(qty, 10) || 1));
  };

  // Compute unit price and total running price dynamically
  const unitPrice =
    (selectedBase?.price || 0) +
    (selectedSauce?.price || 0) +
    (selectedCheese?.price || 0) +
    selectedVeggies.reduce((sum, v) => sum + (v.price || 0), 0);

  const runningTotal = unitPrice * quantity;

  const isReadyForSummary = Boolean(selectedBase && selectedSauce && selectedCheese);

  const resetBuilder = () => {
    setSelectedBase(null);
    setSelectedSauce(null);
    setSelectedCheese(null);
    setSelectedVeggies([]);
    setQuantity(1);
  };

  return (
    <BuilderContext.Provider
      value={{
        options,
        loadingOptions,
        optionsError,
        selectedBase,
        setSelectedBase,
        selectedSauce,
        setSelectedSauce,
        selectedCheese,
        setSelectedCheese,
        selectedVeggies,
        setSelectedVeggies,
        toggleVeggie,
        loadPizzaConfiguration,
        quantity,
        setQuantity,
        unitPrice,
        runningTotal,
        isReadyForSummary,
        resetBuilder,
        fetchOptions,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
};

export default BuilderContext;
