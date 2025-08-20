import { Module } from '@nestjs/common'
import { EcpayService } from './ecpay.service'
import { EcpayController } from './ecpay.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../order/order.entity'
import { OrderService } from '../order/order.service'
import { OrderItem } from '../order/order-item.entity'
import { Product } from '../product/product.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product])
  ],
  providers: [EcpayService, OrderService],
  controllers: [EcpayController],
  exports: [EcpayService]
})
export class EcpayModule {}