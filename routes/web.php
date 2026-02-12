<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\PosController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Inventory\ItemController;
use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\PurchaseOrderController;
use App\Http\Controllers\Inventory\SupplierController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Inventory\ItemLogController;
use App\Http\Controllers\Inventory\AssemblyController;
use App\Http\Controllers\Warranty\WarrantyController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SalesHistoryController;
use App\Http\Controllers\IncomeExpenseController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:access dashboard'])
    ->name('dashboard');

Route::post('pos/collect-debt', [PosController::class, 'collectDebt'])
    ->middleware(['auth', 'verified', 'permission:access pos'])
    ->name('pos.collect-debt');

Route::get('pos/receipt/{sale}', [PosController::class, 'receipt'])
    ->middleware(['auth', 'verified', 'permission:access pos'])
    ->name('pos.receipt');

Route::resource('pos', PosController::class)->middleware(['auth', 'verified', 'permission:access pos']);

Route::get('cash-register', [CashRegisterController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:access drawer'])
    ->name('cash-register.index');

Route::post('cash-register/open', [CashRegisterController::class, 'open'])
    ->middleware(['auth', 'verified', 'permission:access drawer'])
    ->name('cash-register.open');

Route::post('cash-register/close', [CashRegisterController::class, 'close'])
    ->middleware(['auth', 'verified', 'permission:access drawer'])
    ->name('cash-register.close');

Route::get('cash-register/shift-review', [CashRegisterController::class, 'getShiftReview'])
    ->middleware(['auth', 'verified', 'permission:access drawer'])
    ->name('cash-register.shift-review');

Route::post('cash-register/finalize', [CashRegisterController::class, 'finalize'])
    ->middleware(['auth', 'verified', 'permission:access drawer'])
    ->name('cash-register.finalize');

Route::prefix('register-history')
    ->middleware(['auth', 'verified', 'permission:access register-history'])
    ->group(function () {
        Route::get('/', [SalesHistoryController::class, 'index'])
            ->name('register-history.index');
        Route::get('{session}', [SalesHistoryController::class, 'show'])
            ->name('register-history.show');
        Route::post('{session}/request-access', [SalesHistoryController::class, 'requestAccess'])
            ->name('register-history.request-access');
        Route::post('requests/{accessRequest}/approve', [SalesHistoryController::class, 'approve'])
            ->name('register-history.approve');
        Route::post('requests/{accessRequest}/deny', [SalesHistoryController::class, 'deny'])
            ->name('register-history.deny');
        Route::post('sales/{sale}/return', [SalesHistoryController::class, 'returnSale'])
            ->name('register-history.return');
        Route::post('sales/{sale}/refund-source', [SalesHistoryController::class, 'setRefundSource'])
            ->name('register-history.refund-source');
        Route::put('{session}', [SalesHistoryController::class, 'update'])
            ->name('register-history.update');
    });

Route::get('income-expense', [IncomeExpenseController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:access income-expense'])
    ->name('income-expense.index');

Route::post('income-expense', [IncomeExpenseController::class, 'store'])
    ->middleware(['auth', 'verified', 'permission:access income-expense'])
    ->name('income-expense.store');

Route::get('warranty', [WarrantyController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:access warranty'])
    ->name('warranty.index');

Route::put('income-expense/{incomeExpense}', [IncomeExpenseController::class, 'update'])
    ->middleware(['auth', 'verified', 'permission:access income-expense'])
    ->name('income-expense.update');

Route::delete('income-expense/{incomeExpense}', [IncomeExpenseController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'permission:access income-expense'])
    ->name('income-expense.destroy');

Route::resource('users', UserController::class)
    ->except(['show'])
    ->middleware(['auth', 'verified', 'permission:access users']);

Route::resource('customers', CustomerController::class)
    ->except(['show', 'create', 'edit'])
    ->middleware(['auth', 'verified', 'permission:access customers']);

Route::post('customers/{customer}/pay-debt', [CustomerController::class, 'payDebt'])
    ->middleware(['auth', 'verified', 'permission:access customers'])
    ->name('customers.pay-debt');

Route::prefix('inventory')
    ->middleware(['auth', 'verified'])
    ->group(function () {
        Route::resource('items', ItemController::class)
            ->except(['show', 'create', 'edit'])
            ->middleware('permission:access inventory-items')
            ->names([
                'index' => 'inventory.items',
                'store' => 'inventory.items.store',
                'update' => 'inventory.items.update',
                'destroy' => 'inventory.items.destroy',
            ]);

        Route::post('brands', [ItemController::class, 'storeBrand'])
            ->middleware('permission:access inventory-items')
            ->name('inventory.brands.store');

        Route::resource('categories', CategoryController::class)
            ->except(['show', 'create', 'edit'])
            ->middleware('permission:access inventory-categories')
            ->names([
                'index' => 'inventory.categories',
                'store' => 'inventory.categories.store',
                'update' => 'inventory.categories.update',
                'destroy' => 'inventory.categories.destroy',
            ]);

        Route::middleware('permission:access inventory-purchase-orders')->group(function () {
            Route::get('purchase-orders/badge-count', [PurchaseOrderController::class, 'badgeCount'])
                ->name('inventory.purchase-orders.badge-count');
            Route::resource('purchase-orders', PurchaseOrderController::class)
                ->except(['show', 'create', 'edit'])
                ->names([
                    'index' => 'inventory.purchase-orders',
                    'store' => 'inventory.purchase-orders.store',
                    'update' => 'inventory.purchase-orders.update',
                    'destroy' => 'inventory.purchase-orders.destroy',
                ]);

            Route::post('purchase-orders/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve'])
                ->name('inventory.purchase-orders.approve');

            Route::post('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])
                ->name('inventory.purchase-orders.receive');
        });

        Route::resource('stock-adjustments', StockAdjustmentController::class)
            ->only(['index', 'store', 'destroy'])
            ->middleware('permission:access inventory-stock-adjustments')
            ->names([
                'index' => 'inventory.stock-adjustments',
                'store' => 'inventory.stock-adjustments.store',
                'destroy' => 'inventory.stock-adjustments.destroy',
            ]);

        Route::get('logs', [ItemLogController::class, 'index'])
            ->middleware('permission:access inventory-log')
            ->name('inventory.logs');

        Route::resource('assembly', AssemblyController::class)
            ->only(['index', 'store'])
            ->middleware('permission:access inventory-assembly')
            ->names([
                'index' => 'inventory.assembly',
                'store' => 'inventory.assembly.store',
            ]);

        Route::resource('suppliers', SupplierController::class)
            ->except(['show', 'create', 'edit'])
            ->middleware('permission:access inventory-suppliers')
            ->names([
                'index' => 'inventory.suppliers',
                'store' => 'inventory.suppliers.store',
                'update' => 'inventory.suppliers.update',
                'destroy' => 'inventory.suppliers.destroy',
            ]);
    });

Route::prefix('reports')
    ->middleware(['auth', 'verified', 'permission:access reports'])
    ->group(function () {
        Route::get('sales-summary', fn() => Inertia::render('Reports/SalesSummary'))->name('reports.sales-summary');
        Route::get('sales-by-item', fn() => Inertia::render('Reports/SalesByItem'))->name('reports.sales-by-item');
        Route::get('sales-by-employee', fn() => Inertia::render('Reports/SalesByEmployee'))->name('reports.sales-by-employee');
        Route::get('sales-by-payment-type', fn() => Inertia::render('Reports/SalesByPaymentType'))->name('reports.sales-by-payment-type');
        Route::get('receipts', fn() => Inertia::render('Reports/Receipts'))->name('reports.receipts');
        Route::get('inventory-valuation', fn() => Inertia::render('Reports/InventoryValuation'))->name('reports.inventory-valuation');
        Route::get('inventory-count', fn() => Inertia::render('Reports/InventoryCount'))->name('reports.inventory-count');
    });

require __DIR__.'/settings.php';
