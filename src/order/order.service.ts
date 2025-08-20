import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from './order.entity'
import { OrderItem } from './order-item.entity'
import { CreateOrderDto } from './dto/create-order.dto'
import { Product } from '../product/product.entity'

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId?: number): Promise<Order> {
    // 生成訂單編號
    const orderNumber = await this.generateOrderNumber()

    // 建立訂單
    const order = this.orderRepository.create({
      order_number: orderNumber,
      customer_name: createOrderDto.customer_name,
      customer_phone: createOrderDto.customer_phone,
      customer_email: createOrderDto.customer_email,
      shipping_address: createOrderDto.shipping_address,
      shipping_method_id: createOrderDto.shipping_method_id,
      shipping_method_name: createOrderDto.shipping_method_name,
      shipping_fee: createOrderDto.shipping_fee || 0,
      payment_method: createOrderDto.payment_method,
      total_amount: createOrderDto.total_amount,
      notes: createOrderDto.notes,
      company: createOrderDto.company,
      user_id: userId,
      status: 'pending'
    })

    const savedOrder = await this.orderRepository.save(order)

    // 建立訂單項目並檢查庫存
    const orderItems: OrderItem[] = []
    for (const item of createOrderDto.items) {
      // 獲取商品資訊
      const product = await this.productRepository.findOne({
        where: { id: item.product_id }
      })

      if (!product) {
        throw new NotFoundException(`商品 ID ${item.product_id} 不存在`)
      }

      // 檢查庫存是否足夠
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(`商品 "${product.name}" 庫存不足，目前庫存：${product.stock_quantity}，需求數量：${item.quantity}`)
      }

      // 扣減庫存
      product.stock_quantity -= item.quantity
      await this.productRepository.save(product)

      const orderItem = this.orderItemRepository.create({
        order_id: savedOrder.id,
        product_id: item.product_id,
        product_name: item.product_name || product.name,
        product_sku: item.product_sku || product.sku,
        quantity: item.quantity,
        price: item.price,
        product_thumbnail: product.thumbnail,
        variant_options: item.selected_specs && Object.keys(item.selected_specs).length > 0 ? item.selected_specs : null
      })

      orderItems.push(orderItem)
    }

    await this.orderItemRepository.save(orderItems)

    // 返回完整的訂單資訊
    return this.findOne(savedOrder.id)
  }

  async findAll(
    company: string, 
    page: number = 1, 
    limit: number = 20,
    filters?: {
      status?: string,
      search?: string,
      paymentMethod?: string,
      startDate?: string,
      endDate?: string,
      productName?: string
    }
  ): Promise<{ data: Order[], total: number }> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.company = :company', { company })

    // 狀態篩選
    if (filters?.status && filters.status !== 'all') {
      queryBuilder.andWhere('order.status = :status', { status: filters.status })
    }

    // 搜尋條件（訂單編號、客戶姓名、電話）
    if (filters?.search) {
      queryBuilder.andWhere(
        '(order.order_number ILIKE :search OR order.customer_name ILIKE :search OR order.customer_phone ILIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    // 付款方式篩選
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      queryBuilder.andWhere('order.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod })
    }

    // 日期範圍篩選
    if (filters?.startDate) {
      queryBuilder.andWhere('DATE(order.created_at) >= :startDate', { startDate: filters.startDate })
    }
    if (filters?.endDate) {
      queryBuilder.andWhere('DATE(order.created_at) <= :endDate', { endDate: filters.endDate })
    }

    // 商品名稱篩選
    if (filters?.productName) {
      queryBuilder.andWhere('items.product_name ILIKE :productName', { productName: `%${filters.productName}%` })
    }

    // 排序和分頁
    queryBuilder
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [orders, total] = await queryBuilder.getManyAndCount()

    return { data: orders, total }
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'user']
    })

    if (!order) {
      throw new NotFoundException(`訂單 ID ${id} 不存在`)
    }

    return order
  }

  async findByUser(userId: number, company: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user_id: userId, company },
      relations: ['items'],
      order: { created_at: 'DESC' }
    })
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const order = await this.findOne(id)
    const oldStatus = order.status
    
    // 如果訂單從非取消狀態改為取消狀態，需要回復庫存
    if (oldStatus !== 'cancelled' && status === 'cancelled') {
      await this.restoreStock(order)
    }
    
    // 如果訂單從取消狀態改為其他狀態，需要重新扣減庫存
    if (oldStatus === 'cancelled' && status !== 'cancelled') {
      await this.deductStock(order)
    }
    
    order.status = status
    return this.orderRepository.save(order)
  }

  private async restoreStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id }
      })
      
      if (product) {
        product.stock_quantity += item.quantity
        await this.productRepository.save(product)
      }
    }
  }

  private async deductStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id }
      })
      
      if (!product) {
        throw new NotFoundException(`商品 ID ${item.product_id} 不存在`)
      }
      
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(`商品 "${product.name}" 庫存不足，目前庫存：${product.stock_quantity}，需求數量：${item.quantity}`)
      }
      
      product.stock_quantity -= item.quantity
      await this.productRepository.save(product)
    }
  }

  async updatePaymentStatus(id: number, paymentStatus: string): Promise<Order> {
    const order = await this.findOne(id)
    order.payment_status = paymentStatus
    return this.orderRepository.save(order)
  }

  async updateShippingStatus(id: number, shippingStatus: string): Promise<Order> {
    const order = await this.findOne(id)
    order.shipping_status = shippingStatus
    return this.orderRepository.save(order)
  }

  async updateAdminNotes(id: number, adminNotes: string): Promise<Order> {
    const order = await this.findOne(id)
    order.admin_notes = adminNotes
    return this.orderRepository.save(order)
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // 查找今天的最後一個訂單編號
    const datePrefix = `ORD-${year}${month}${day}`
    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.order_number LIKE :prefix', { prefix: `${datePrefix}%` })
      .orderBy('order.order_number', 'DESC')
      .getOne()

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-3))
      sequence = lastSequence + 1
    }

    return `${datePrefix}${String(sequence).padStart(3, '0')}`
  }
}