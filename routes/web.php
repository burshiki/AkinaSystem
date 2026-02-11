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
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SalesHistoryController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:access dashboard'])
    ->name('dashboard');

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

Route::prefix('sales-history')
    ->middleware(['auth', 'verified', 'permission:access sales-history'])
    ->group(function () {
        Route::get('/', [SalesHistoryController::class, 'index'])
            ->name('sales-history.index');
        Route::get('{session}', [SalesHistoryController::class, 'show'])
            ->name('sales-history.show');
        Route::post('{session}/request-access', [SalesHistoryController::class, 'requestAccess'])
            ->name('sales-history.request-access');
        Route::post('requests/{accessRequest}/approve', [SalesHistoryController::class, 'approve'])
            ->name('sales-history.approve');
        Route::post('requests/{accessRequest}/deny', [SalesHistoryController::class, 'deny'])
            ->name('sales-history.deny');
        Route::put('{session}', [SalesHistoryController::class, 'update'])
            ->name('sales-history.update');
    });

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

require __DIR__.'/settings.php';
