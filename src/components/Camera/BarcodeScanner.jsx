{/* ✅ إدخال باركود يدوي (بديل) */}
<div className="manual-barcode-container">
    <div className="manual-barcode-row">
        <input 
            type="text" 
            placeholder="أو أدخل الباركود يدوياً"
            id="manualBarcode"
            className="manual-barcode-input"
        />
        <button 
            onClick={async () => {
                const input = document.getElementById('manualBarcode');
                const barcode = input.value.trim();
                if (barcode) {
                    setIsLoading(true);
                    try {
                        const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                        if (response.data.status === 1) {
                            const product = response.data.product;
                            const nutriments = product.nutriments || {};
                            handleBarcodeScanned({
                                name: product.product_name || `منتج (${barcode.slice(-8)})`,
                                calories: nutriments['energy-kcal'] || 0,
                                protein: nutriments.proteins || 0,
                                carbs: nutriments.carbohydrates || 0,
                                fat: nutriments.fat || 0,
                                barcode: barcode
                            });
                            input.value = '';
                        } else {
                            handleBarcodeScanned({
                                name: `منتج جديد (${barcode.slice(-8)})`,
                                calories: 0,
                                protein: 0,
                                carbs: 0,
                                fat: 0,
                                barcode: barcode
                            });
                            input.value = '';
                        }
                        setMessage('✅ تم إضافة المنتج بنجاح');
                        setMessageType('success');
                    } catch (err) {
                        setMessage('⚠️ حدث خطأ في البحث عن المنتج');
                        setMessageType('error');
                    } finally {
                        setIsLoading(false);
                        setTimeout(() => setMessage(''), 3000);
                    }
                }
            }}
            className="manual-barcode-btn"
        >
            🔍 بحث
        </button>
    </div>
</div>