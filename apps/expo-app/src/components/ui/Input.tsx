import { Icon, type IconKeys } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Text, TextInput, TextInputProps, View } from 'react-native'

interface InputProps<T extends FieldValues> extends TextInputProps {
  label?: string
  className?: string
  control: Control<T>
  name: Path<T>
  icon?: IconKeys
  secureTextEntry?: boolean
}

export function Input<T extends FieldValues>({
  label,
  className,
  control,
  name,
  icon,
  secureTextEntry = true,
  ...rest
}: InputProps<T>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(true)

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible)
  }

  return (
    <View>
      <Controller
        control={control}
        name={name}
        render={({
          field: { value, onBlur, onChange },
          fieldState: { error },
        }) => (
          <>
            <View className='flex-row justify-between'>
              <Text className='text-sm mb-1 text-[#111827] font-poppins-medium'>
                {label}
              </Text>
              {error && (
                <Text className='text-xs text-red-500 font-poppins'>
                  {error?.message}
                </Text>
              )}
            </View>
            <View
              className={cn(
                'flex-row items-center rounded-xl p-4 border bg-[#F3F4F6] border-[#E5E7EB]',
                error ? 'border-red-300' : 'border-gray-300'
              )}
            >
              {icon ? <Icon name={icon} size={20} color='#6366F1' /> : null}
              <TextInput
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                className={cn(
                  'flex-1 mx-3 text-[#111827] font-poppins text-lg',
                  className
                )}
                secureTextEntry={
                  name === 'password' ||
                  name === 'confirmPassword' ||
                  name === 'oldPassword' ||
                  name === 'newPassword' ||
                  name === 'confirmNewPassword'
                    ? isPasswordVisible
                    : false
                }
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor='#9CA3AF'
                style={{
                  textAlignVertical: 'center',
                  paddingVertical: 0,
                  includeFontPadding: false,
                }}
                {...(rest as any)}
              />
              {(name === 'password' ||
                name === 'confirmPassword' ||
                name === 'oldPassword' ||
                name === 'newPassword' ||
                name === 'confirmNewPassword') &&
                value.length > 0 && (
                  <Icon
                    name={isPasswordVisible ? 'EyeOff' : 'Eye'}
                    size={20}
                    color='#6366F1'
                    onPress={togglePasswordVisibility}
                  />
                )}
            </View>
          </>
        )}
      />
    </View>
  )
}
