<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\PosController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Inventory\ItemController;
use App\Http\Controllers\Inventory\CategoryController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified', 'permission:access dashboard'])->name('dashboard');

Route::resource('pos', PosController::class)->middleware(['auth', 'verified', 'permission:access pos']);

Route::resource('users', UserController::class)
    ->except(['show'])
    ->middleware(['auth', 'verified', 'permission:access users']);

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

        Route::get('purchase-orders', fn () => Inertia::render('Inventory/PurchaseOrders'))
            ->middleware('permission:access inventory-purchase-orders')
            ->name('inventory.purchase-orders');

        Route::get('stock-adjustments', fn () => Inertia::render('Inventory/StockAdjustments'))
            ->middleware('permission:access inventory-stock-adjustments')
            ->name('inventory.stock-adjustments');

        Route::get('assembly', fn () => Inertia::render('Inventory/Assembly'))
            ->middleware('permission:access inventory-assembly')
            ->name('inventory.assembly');

        Route::get('suppliers', fn () => Inertia::render('Inventory/Suppliers'))
            ->middleware('permission:access inventory-suppliers')
            ->name('inventory.suppliers');

        Route::get('logs', fn () => Inertia::render('Inventory/Logs'))
            ->middleware('permission:access inventory-log')
            ->name('inventory.logs');
    });

require __DIR__.'/settings.php';
