import AntDesign from '@expo/vector-icons/AntDesign'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs'
import { Platform } from 'react-native'

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor='#FAFAFA'
      iconColor={{
        default: '#9CA3AF',
        selected: '#FAFAFA',
      }}
      tintColor='#6366F1'
      labelStyle={{
        default: {
          color: '#9CA3AF',
          fontSize: 12,
          fontWeight: '400',
        },
        selected: {
          color: '#6366F1',
          fontSize: 12,
          fontWeight: '700',
        },
      }}
      indicatorColor='#6366F1'
      rippleColor='#6366F1'
      shadowColor='#00000010'
    >
      <NativeTabs.Trigger name='index'>
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: (
            <Icon src={<VectorIcon family={Ionicons} name='home-outline' />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='orders'>
        <Label>Orders</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'cart', selected: 'cart.fill' }} />,
          android: (
            <Icon
              src={<VectorIcon family={AntDesign} name='shopping-cart' />}
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='settings'>
        <Label>Settings</Label>
        {Platform.select({
          ios: (
            <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
          ),
          android: (
            <Icon
              src={<VectorIcon family={Ionicons} name='settings-outline' />}
            />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
